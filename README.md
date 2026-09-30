# The Orrery v1.4.0

An offline-first interactive Solar System orrery with **Explore**, **Observe**, and **Learn** modes plus an optional NASA/JPL Horizons precision layer.

## Visual modes

### Antique

The default hand-tinted heliocentric plate. It deliberately preserves the visual identity of v1.0–v1.3.

### Natural

A darker astronomical presentation with:

- Sun-aligned sphere illumination and soft terminators
- illuminated atmospheric limbs
- projected Saturn ring geometry
- dual Halley ion/dust tails
- denser star field inside the plate
- 3D ecliptic-plane grid
- depth-sorted bodies
- higher-resolution procedural surfaces

No external texture images are required, so the full visual renderer remains offline-capable.

## Visual controls

- `LOOK · ANTIQUE/NATURAL`
- `VIEW · FLAT/3D`
- `SCALE · LOG/TRUE`
- Settings → Label density: Minimal / Smart / All
- Settings → Show ecliptic plane
- Settings → Show motion trails

Shared links use the v5 state schema and preserve visual look and label mode while remaining backward-compatible with earlier links.

## Existing product modes

- **Explore** — heliocentric simulation, almanac, date/timeline navigation and body following.
- **Observe** — offline planning-grade local sky calculations with optional Horizons precision data.
- **Learn** — guided demonstrations of orbital geometry, seasons, phases and retrograde motion.

## Architecture

The editable application source is under `src/` and is bundled into the single production `index.html`:

```bash
node tools/build.mjs
```

The static PWA is fully usable without the optional `precision-worker/` backend.

## Validation

Final P8 release checks include:

- standalone astronomy/platform suite
- embedded browser suite
- precision Worker suite
- P5/P6/P7 regression interactions
- dedicated P8 visual interactions
- 13 responsive viewport classes
- 3 visual-regression baselines
- PWA/service-worker validation

See `QA_CERTIFICATION.md` for the exact results and limitations.
