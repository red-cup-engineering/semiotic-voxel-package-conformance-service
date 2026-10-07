import assert from "node:assert/strict";
import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  assaySemioticVoxelPackageBody,
  semioticVoxelPackageDescriptorViolations,
} from "../src/assay-semiotic-voxel-package-body.mjs";

const carrier = "lib/emsenn/services/561-group/services/red-cup-engineering/services/example";

function descriptor(packageName, overrides = {}) {
  return {
    profile: "org.harmonious-union.semiotic-voxel.v1",
    owner: "red-cup-engineering",
    kind: "capability-cell",
    actor: "urn:ame:example",
    operations: ["do-example"],
    capabilities: [{ capability: "example", faces: ["do-example"] }],
    package: packageName,
    ...overrides,
  };
}

test("admits independently owned package/deployment carrier descriptors", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-conformance-"));
  await mkdir(join(root, carrier), { recursive: true });
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/example", version: "1.0.0", "x-semiotic-voxel": descriptor("@red-cup-engineering/example") })}\n`);
  assert.deepEqual(await assaySemioticVoxelPackageBody({ root }), { type: "SemioticVoxelPackageBodyConformanceReceipt", version: 1, conformant: true, carriers: 1, defects: [] });
});

test("keeps package descriptors distinct from semantic and active-voxel carriers", () => {
  const semanticOrActiveCarriers = [
    { id: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", polarity: "proponent", parentIds: [] },
    { kind: "utterance.mark", value: "example" },
    { kind: "utterance.carrier", token: {}, claim: {} },
    { kind: "utterance.articulation.cell", potentialAperiodicArticulationCell: [] },
    { position: { atoms: [] }, invocation: "current" },
  ];
  for (const value of semanticOrActiveCarriers) {
    assert.ok(semioticVoxelPackageDescriptorViolations({
      name: "@red-cup-engineering/example",
      "x-semiotic-voxel": value,
    }).length > 0);
  }
});

test("refuses incomplete or non-normalized package descriptor shapes", () => {
  const packageName = "@red-cup-engineering/example";
  assert.deepEqual(
    semioticVoxelPackageDescriptorViolations({
      name: packageName,
      "x-semiotic-voxel": {
        profile: "org.harmonious-union.semiotic-voxel.v1",
        owner: "red-cup-engineering",
        package: packageName,
      },
    }),
    ["descriptor-fields", "kind", "actor", "operations", "capabilities"],
  );
  assert.deepEqual(
    semioticVoxelPackageDescriptorViolations({
      name: packageName,
      "x-semiotic-voxel": descriptor(packageName, { kind: "service" }),
    }),
    ["kind"],
  );
  assert.deepEqual(
    semioticVoxelPackageDescriptorViolations({
      name: packageName,
      "x-semiotic-voxel": descriptor(packageName, {
        operations: ["do-example", "do-example"],
        capabilities: [{ capability: "example", faces: ["do-example"], semanticAtom: true }],
      }),
    }),
    ["operations", "capabilities"],
  );
});

test("refuses root authority and local provider protocols", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-refusal-"));
  await mkdir(join(root, carrier), { recursive: true });
  await writeFile(join(root, "package.json"), "{}\n");
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@emsenn/example", dependencies: { "@emsenn/provider": "workspace:*" } })}\n`);
  await assert.rejects(() => assaySemioticVoxelPackageBody({ root }), (error) => error.receipt.defects.some(({ law }) => law === "no-local-provider-protocol"));
});

test("refuses package installs that symlink into another carrier", async () => {
  const root = await mkdtemp(join(tmpdir(), "voxel-install-refusal-"));
  await mkdir(join(root, carrier, "node_modules", "@red-cup-engineering"), { recursive: true });
  const provider = join(root, "lib/emsenn/services/561-group/services/red-cup-engineering/services/provider");
  await mkdir(provider, { recursive: true });
  await writeFile(join(root, carrier, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/example", version: "1.0.0", "x-semiotic-voxel": descriptor("@red-cup-engineering/example") })}\n`);
  await writeFile(join(provider, "package.json"), `${JSON.stringify({ name: "@red-cup-engineering/provider", version: "1.0.0", "x-semiotic-voxel": descriptor("@red-cup-engineering/provider", { actor: "urn:ame:provider" }) })}\n`);
  await symlink(provider, join(root, carrier, "node_modules", "@red-cup-engineering", "provider"));
  await assert.rejects(() => assaySemioticVoxelPackageBody({ root }), (error) => error.receipt.defects.some(({ law }) => law === "no-cross-package-install-symlink"));
});

async function inventoryFixture(context) {
  const parent = await mkdtemp(join(tmpdir(), "voxel-inventory-"));
  context.after(() => rm(parent, { recursive: true, force: true }));
  const root = join(parent, "body");
  const material = join(root, carrier);
  const manifest = { name: "@red-cup-engineering/example", version: "1.0.0", "x-semiotic-voxel": descriptor("@red-cup-engineering/example") };
  await mkdir(material, { recursive: true });
  await writeFile(join(material, "package.json"), JSON.stringify(manifest));
  return { parent, root, material, manifest };
}

function incompleteAt(paths) {
  return (error) => {
    assert.equal(error.code, "ERR_PACKAGE_BODY_INVENTORY_INCOMPLETE");
    assert.deepEqual(error.paths, [...paths].sort());
    assert.equal(Object.hasOwn(error, "receipt"), false);
    return true;
  };
}

for (const location of ["in-root", "out-of-root"]) {
  test(`a linked material directory yields incomplete inventory (${location})`, async (context) => {
    const fixture = await inventoryFixture(context);
    const target = join(location === "in-root" ? fixture.root : fixture.parent, "linked-target");
    await mkdir(target);
    await writeFile(join(target, "package.json"), JSON.stringify({
      name: "@red-cup-engineering/hidden", version: "1.0.0",
      "x-semiotic-voxel": descriptor("@red-cup-engineering/hidden"),
      dependencies: { "@red-cup-engineering/provider": "workspace:*" },
    }));
    await symlink(target, join(fixture.material, "linked"));
    await assert.rejects(() => assaySemioticVoxelPackageBody(fixture), incompleteAt([`${carrier}/linked`]));
  });
}

test("linked manifests and ordinary source files are explicitly unsupported inventory shapes", async (context) => {
  const fixture = await inventoryFixture(context);
  const target = join(fixture.parent, "manifest.json");
  await writeFile(target, JSON.stringify(fixture.manifest));
  await mkdir(join(fixture.material, "linked-carrier"));
  await symlink(target, join(fixture.material, "linked-carrier", "package.json"));
  await symlink(target, join(fixture.material, "source.mjs"));
  await assert.rejects(() => assaySemioticVoxelPackageBody(fixture), incompleteAt([
    `${carrier}/linked-carrier/package.json`, `${carrier}/source.mjs`,
  ]));
});

test("dangling and cyclic links are reported without following their targets", async (context) => {
  const fixture = await inventoryFixture(context);
  await symlink("missing", join(fixture.material, "dangling"));
  await symlink("b", join(fixture.material, "a"));
  await symlink("a", join(fixture.material, "b"));
  await assert.rejects(() => assaySemioticVoxelPackageBody(fixture), incompleteAt([
    `${carrier}/a`, `${carrier}/b`, `${carrier}/dangling`,
  ]));
});

for (const prefix of ["lib", "lib/emsenn", "lib/emsenn/services"]) {
  test(`the fixed inventory prefix cannot silently traverse a link (${prefix})`, async (context) => {
    const fixture = await inventoryFixture(context);
    const target = join(fixture.parent, "territory-target");
    await rename(join(fixture.root, prefix), target);
    await symlink(target, join(fixture.root, prefix));
    await assert.rejects(() => assaySemioticVoxelPackageBody(fixture), incompleteAt([prefix]));
  });
}

test("deliberately excluded territory and skipped directory names retain their exclusions", async (context) => {
  const fixture = await inventoryFixture(context);
  const target = join(fixture.parent, "outside");
  await mkdir(target);
  await writeFile(join(target, "package.json"), "not-json");
  for (const name of [".git", ".archive", ".cache", ".venv", "build", "dist", "venv"]) {
    await symlink(target, join(fixture.material, name));
  }
  await mkdir(join(fixture.material, "content", "assets"), { recursive: true });
  await symlink(target, join(fixture.material, "content", "assets", "legacy"));
  const receipt = await assaySemioticVoxelPackageBody(fixture);
  assert.equal(receipt.conformant, true);
  assert.equal(receipt.carriers, 1);
});

test("ordinary install roots retain allowed links within that install root", async (context) => {
  const fixture = await inventoryFixture(context);
  const install = join(fixture.material, "node_modules");
  const provider = join(install, "actual");
  await mkdir(provider, { recursive: true });
  await symlink(provider, join(install, "provider"));
  assert.equal((await assaySemioticVoxelPackageBody(fixture)).conformant, true);
});

test("a linked install root is incomplete rather than silently uninspected", async (context) => {
  const fixture = await inventoryFixture(context);
  const install = join(fixture.parent, "install");
  await mkdir(install);
  await symlink(install, join(fixture.material, "node_modules"));
  await assert.rejects(() => assaySemioticVoxelPackageBody(fixture), incompleteAt([`${carrier}/node_modules`]));
});

test("CLI keeps complete conformance receipts separate from incomplete-inventory failure", async (context) => {
  const fixture = await inventoryFixture(context);
  const script = fileURLToPath(new URL("../scripts/assay-semiotic-voxel-package-body.mjs", import.meta.url));
  const invoke = () => spawnSync(process.execPath, [script, fixture.root], { encoding: "utf8" });
  const accepted = invoke();
  assert.equal(accepted.status, 0);
  assert.equal(JSON.parse(accepted.stdout).conformant, true);
  await writeFile(join(fixture.material, "package.json"), JSON.stringify({
    ...fixture.manifest, dependencies: { "@red-cup-engineering/provider": "workspace:*" },
  }));
  const refused = invoke();
  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, "");
  const receipt = JSON.parse(refused.stderr);
  assert.equal(receipt.type, "SemioticVoxelPackageBodyConformanceReceipt");
  assert.equal(receipt.conformant, false);
  assert.ok(receipt.defects.some(({ law }) => law === "no-local-provider-protocol"));
  await symlink("missing", join(fixture.material, "dangling"));
  const incomplete = invoke();
  assert.equal(incomplete.status, 1);
  assert.equal(incomplete.stdout, "");
  const failure = JSON.parse(incomplete.stderr);
  assert.equal(failure.code, "ERR_PACKAGE_BODY_INVENTORY_INCOMPLETE");
  assert.deepEqual(failure.paths, [`${carrier}/dangling`]);
  assert.match(failure.error, /inventory incomplete/);
  assert.equal(Object.hasOwn(failure, "conformant"), false);
});
