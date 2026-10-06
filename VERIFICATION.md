# Starlight 0.3.26 verification — 2026-09-30

Implemented: an offline ESO/S. Brunier 4000×2000 Milky Way panorama,
galactic/horizon reprojection, a cached WebGL texture and framebuffer,
context-loss fallback/recovery, mode controls and resource release.

Passed:
- All 20 existing/new Node test scripts via `npm test`.
- 800 independent comparisons of the photo shader's rays against the
  catalog projection and Astronomy Engine conversions, including phone
  roll, portrait/landscape, different observers and dates.
- Real WebGL pixel checks in desktop Chromium 154 with SwiftShader:
  texture direction, horizon masking, reused frames, a framebuffer capped
  at 1,500,000 pixels, context recovery, image cancellation and mode changes.
- AR, red night mode and simulated daylight hide the photographic layer;
  absent WebGL and missing images keep the procedural background.
- The panorama's bytes match SHA-256
  `5363732a1629eed9df2f707b31eaae6b117c0ee35d7cc8d6ddd636bc6512302d`.
- Source syntax and workflow YAML parse; the packaged source includes
  the exact photograph and its attribution/license.

The release workflow requires Android compilation, bundled-asset checks
and verification against the fixed signing certificate before publishing
the APK. These source checks were completed before that release run;
the matching GitHub Actions run records the release result.

Android-device visual quality, sensor/AR alignment, frame rate, memory and
power tests remain pending. Desktop rendering checks do not establish
Android performance. Private signing material is excluded from this
source package.
