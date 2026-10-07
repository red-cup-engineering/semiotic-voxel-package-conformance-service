#!/usr/bin/env node
import { assaySemioticVoxelPackageBody } from "../src/assay-semiotic-voxel-package-body.mjs";

try {
  process.stdout.write(`${JSON.stringify(await assaySemioticVoxelPackageBody({ root: process.argv[2] ?? process.cwd() }), null, 2)}\n`);
} catch (error) {
  const failure = error.receipt ?? {
    error: error.message,
    ...(error.code === "ERR_PACKAGE_BODY_INVENTORY_INCOMPLETE" ? { code: error.code, paths: error.paths } : {}),
  };
  process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
}
