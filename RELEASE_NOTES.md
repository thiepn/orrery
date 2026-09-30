# The Orrery v1.4.0 — P8 Visual Excellence

P8 is a renderer/interaction release. It keeps the P7 scientific and precision architecture intact while substantially improving how the Solar System reads visually.

## Two visual identities

- **Antique** remains the default and preserves the hand-tinted paper-plate presentation.
- **Natural** is an optional dark-space presentation with stronger physical lighting, brighter atmospheres, projected rings, denser stars and a restrained astronomical palette.
- Natural mode is fully offline and uses enhanced procedural surfaces; no third-party image/CDN dependency was added.

## Lighting and body rendering

- Planet illumination is now aligned to the Sun in the current scene/camera geometry instead of using a fixed artificial light vector.
- Terminators are softer and the night side is darker in Natural mode.
- Natural Earth receives a small ocean-like specular response.
- Procedural surface maps increased from 128×64 to 192×96.
- Atmospheric bodies receive a stronger illuminated limb in Natural mode.
- Solar corona/rays now have a dedicated Natural treatment.

## Saturn rings

- Replaced the fixed 2D ring ellipse with a projected 3D ring plane.
- Front/back ring halves are rendered on the correct sides of Saturn.
- Added a more detailed multi-band ring structure and a narrow Cassini-like division cue.
- Ring orientation uses Saturn's J2000 rotational pole rather than a fixed screen angle.

## Comet rendering

Halley now has two visually distinct, heliocentrically responsive tails:

- straight anti-solar ion tail
- broader curved dust tail influenced by the comet's orbital velocity

Tail length and opacity continue to increase toward the Sun.

## Depth and orientation

- Optional ecliptic-plane grid in 3D mode.
- Bodies are depth-sorted in 3D before rendering.
- The grid, inclined paths and projected rings make orbital-plane depth substantially easier to read.

## Labels

New label-placement engine:

- **Minimal** — selected/hovered objects only
- **Smart** — automatic labels with collision avoidance
- **All** — attempts labels for all visible bodies
- avoids other labels and body disks
- adds leader lines when a label must move materially from its preferred position
- retains viewport/toolbar edge protection

## Product integration

- Added `LOOK · ANTIQUE/NATURAL` quick toggle.
- Added visual settings for rendering look, label density, ecliptic plane and motion trails.
- Share-state schema upgraded to **v5** so appearance and label mode survive shared links.
- v1–v4 links remain compatible.
- Visual preferences remain local and require no account.

## Compatibility

P5 utility, P6 Observer/Learn and P7 Precision behavior remain unchanged and are regression-tested.
