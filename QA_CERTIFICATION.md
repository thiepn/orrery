# The Orrery v1.4.0 — P8 QA Certification

## Status

**P8 Visual Excellence: PASS** in the tested Chromium environment.

P8 intentionally changes rendering while preserving the P7 scientific/precision stack. The default Antique appearance stays visually close to P7; Natural is tested as a separate optional state.

## Final automated results

- Standalone application scientific/platform suite: **33/33 passed**.
- Embedded browser suite: **35/35 passed**.
- Precision Worker parser/security suite: **8/8 passed**.
- P5 utility interaction regression: **21/21 passed**, **0** browser errors.
- P6 Observer/Learn regression: **25/25 passed**, **0** browser errors.
- P7 precision interaction regression: **15/15 passed**, **0** browser errors.
- Dedicated P8 visual interaction suite: **15/15 passed**, **0** browser errors.
- Responsive/device-class matrix: **13/13 passed**.
- Visual regression: **3/3 passed** within the existing 2% threshold.
- PWA manifest/service-worker/icon validation: **PASS**.
- App, service-worker and precision-Worker JavaScript syntax: **PASS**.

## Antique visual-regression deltas

Compared with the P7 baselines:

- 320×568: **0.861%** meaningful pixels changed
- 390×844: **0.597%**
- 1366×768: **0.684%**

This confirms that Antique remains visually stable despite renderer internals changing.

## Dedicated P8 coverage

The P8 browser flow verifies:

- Antique ↔ Natural switching
- Natural palette synchronization
- v5 shared state for appearance + label density
- projected Saturn ring basis
- normalized Sun-light vector
- visual-settings persistence
- Halley near the model's next perihelion
- dual-tail orbital velocity basis
- mobile Settings containment in Natural mode
- no horizontal overflow in Natural mobile mode
- Observer containment under Natural theme
- embedded scientific suite after the visual changes

Screenshots include:

- `qa/p8-natural-saturn-desktop.png`
- `qa/p8-halley-2061-desktop.png`
- `qa/p8-natural-mobile.png`
- `qa/p8-observer-natural-mobile.png`

## Performance sample

At 1366×768 in the test Chromium environment, Natural + 3D produced **120 animation frames over a 2-second sample**. This is a smoke measurement rather than a cross-device benchmark.

## Scientific/visual limitations

- Natural surfaces are enhanced procedural maps, not externally sourced photogrammetric/NASA texture maps.
- Saturn's ring orientation uses a fixed J2000 rotational pole; long-term pole precession is not modeled in the renderer.
- Body illumination is physically aligned to the scene Sun and camera projection, but the Explore plate remains an illustrative orthographic scene rather than an Earth-observer photometric renderer.
- Canvas 2D remains the rendering backend; P8 does not migrate to WebGL/WebGPU.
- Physical-device Safari/Android GPU certification is still recommended after deployment.
