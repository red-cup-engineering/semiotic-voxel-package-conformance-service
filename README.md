# Semiotic Voxel Package Conformance Service

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Validates the `x-semiotic-voxel` field in a package's `package.json` as an
exact package/deployment-carrier descriptor, and refuses package *bodies*
that restore workspace authority, local dependency protocols
(`workspace:`/`file:`/`link:`), or ownerless (`@emsenn/`) identities.

Self-contained — no external dependencies, no `node_modules` needed
(`node:fs`/`node:path` only).

## What a Semiotic Voxel is

`x-semiotic-voxel` is package/deployment manifest metadata. Its own source
docstring is explicit that this descriptor is deliberately narrow and
*not* the Voxel itself — it keeps the descriptor's shape mechanically
distinct from a network SemioticAtom, Mark, Utterance, ArticulationCell, or
**the active-only voxel reconstructed by an invocation**. The test file
lists the active-voxel shape alongside the other carrier kinds it must not
be confused with:

```js
{ id: "ni:///sha-256;...", polarity: "proponent", parentIds: [] }               // SemioticAtom
{ kind: "utterance.mark", value: "example" }                                    // Mark
{ kind: "utterance.carrier", token: {}, claim: {} }                             // Utterance
{ kind: "utterance.articulation.cell", potentialAperiodicArticulationCell: [] } // ArticulationCell
{ position: { atoms: [] }, invocation: "current" }                              // the Voxel itself
```

So a Semiotic Voxel is an active-only object — `{ position: { atoms: [] },
invocation }` — reconstructed fresh per invocation, never a
stored/persisted record. The package-manifest descriptor this service
checks (fields: `profile`, `owner`, `kind` ∈ {actor,
aggregate-capability-defect, capability-cell, inert-material}, `actor`,
`operations`, `capabilities[{capability, faces}]`, `package`) is
package/deployment metadata *about* a carrier, mechanically kept distinct
from that live voxel.

## Test status

`node --test` → 5/5 pass.
