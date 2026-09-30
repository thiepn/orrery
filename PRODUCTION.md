# Production Notes — The Orrery v1.4.0

## Runtime architecture

The product remains an offline-first static PWA plus an optional read-only precision Worker.

P8 changes only the client renderer and visual state. Neither Explore, offline Observer, Learn nor PWA startup depends on a network connection.

## Renderer

The main renderer remains Canvas 2D. P8 adds:

- 192×96 procedural body surface maps
- camera-aware Sun light vectors
- soft terminator shading
- natural-mode atmospheric limbs
- projected Saturn rings using a J2000 pole vector
- front/back ring depth separation
- ecliptic-plane grid
- 3D body depth sorting
- dual comet ion/dust tails
- label collision avoidance and leader lines

Natural mode is deliberately asset-independent. This avoids a new image CDN, copyright/licensing surface and offline-cache burden.

## Performance safeguards

Existing safeguards remain active:

- maximum backing-canvas pixel budget
- sphere render cache and rotation quantization
- reduced idle refresh rate
- visibility suspension
- precomputed orbit paths
- deterministic star/asteroid fields

The P8 Natural + 3D smoke sample completed 120 frames in two seconds at 1366×768 in the test Chromium environment.

## Precision layer

The P7 Horizons Worker contract is unchanged. A visual-mode outage or bug must not alter precision result semantics, and a precision outage must never prevent local visual rendering.

## Privacy

P8 introduces no new external request. Natural rendering, labels, rings, comet tails and ecliptic grid are computed locally.
