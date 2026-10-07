# Starlight 0.3.33 source verification — 2026-10-07

Implemented: colored dashed reference circles in the equatorial grid: fixed
J2000 ecliptic (yellow), equator (red), and 0h/12h RA meridian (green).
The ecliptic uses the bundled Astronomy Engine ECL-to-EQJ rotation constants
and the same EQJ-to-horizon transformation as catalog stars. Reference labels
have additional placement alternatives but still defer to objects and HUD.

Retained: stale dialog-close events cannot dispose a reopened detail view;
current external closes still release resources. Opening a detail updates a
dirty chart before capturing its background, including after viewport resize.

Retained: default immersive celestial views with a frozen chart background,
visible zoom/reset/control entry, mode switching without changing the surface
view or selected lunar feature, and loading/error feedback. The chart snapshot
is capped at one million pixels, excludes AR camera content, and is released
on close. It is a fixed browsing backdrop, not live directional guidance.

Retained: camera preview geometry using the actual returned preview size,
rotation and center-cover crop; reported/derived/assumed field-angle status;
tangent-plane width calibration with one-time legacy settings migration.
Fullscreen details release covered galaxy/artwork resources; backgrounding
also releases the main-chart sphere texture sampling caches.

Retained: original moving solar-limb artwork with a separately cached
texture projection; explicit playback/glow controls and reduced-motion default;
40 offline lunar directory centers, text collision avoidance, tap selection
and feature-centered inspection; detail-view lifecycle cleanup and adaptive
512–1024 pixel idle rendering with 256 pixel gesture rendering.

Passed:
- All 26 Node test scripts via npm test.
- Grid checks: 5,214 independently calculated horizon rotations, 181 ecliptic
  vector comparisons against Astronomy Engine, and 36 geocentric Sun dates
  in 2000/2026/2050. Maximum sampled absolute J2000 ecliptic latitude is
  0.00675 degrees; this is a numerical model check, not observational accuracy.
  Existing pole density, clipping, label collision and <9,000-point geometry
  bounds remain passing. The ecliptic is a fixed epoch plane, not an obstacle
  or occultation prediction.
- Real Chromium reference-line checks in portrait and landscape, with roll
  and red night mode: three dashed stroke colors, visible ecliptic name,
  bounded text and grid-toggle hiding. Dash state is restored so later
  chart strokes do not inherit reference styling. No page errors.
- DOM lifecycle checks cover default immersive mode, two-way switching,
  preserved lunar coordinates/zoom/selection, snapshot size and disposal,
  AR exclusion and loading/error text. Lunar details default to inspection
  lighting with explicit non-current-phase copy; switching to actual phase
  lighting updates both the control state and visible caption.
- Three deterministic close/reopen sequences dispatch a delayed old close
  event into the reopened view and retain its renderer and image handlers.
  Closing the current view still clears its canvas and scheduled frames.
- Pure Java preview-geometry checks: expected uncropped and cropped fields,
  all four quarter-turn orientations, missing-angle derivation or explicit
  fallback, invalid input rejection and 432 camera/chart ray comparisons.
  These use a pinhole projection model, not a physical camera image.
- Calibration checks cover tangent-plane pixel scaling, independent AR
  bounds, 35 legacy setting migrations, one-time persistence, invalid
  metadata, reported/estimated/default status, slider changes and reset.
  AR supports 1–170 degrees; manual chart gestures retain 12–110 degrees.
- Real Canvas raster checks show evolving solar-limb pixels without changing
  the opaque sphere pixels. A fixed view projects the source once across
  animated draws and glow changes. View changes and resume after release
  rebuild the cache. Geometry is deterministic and bounded to 180 paths of
  21 samples each.
- Controlled frame-clock tests cover one animation chain, approximately
  30-Hz draw cap, frozen time on pause, no hidden-time jump on resume,
  cancellation and permanent disposal.
- DOM lifecycle checks cover pause/play, glow, touch resolution, fully zoomed
  surface, native and visibility pause/resume, offscreen stop, reduced motion,
  close/switch disposal, image cancellation and texture failure. Controls are
  unavailable while texture loading has not succeeded.
- Official USGS lunar KMZ extraction checks 40 unique adopted names and
  IDs, center coordinates, east-positive longitude and directory diameters.
  The source snapshot SHA256 is retained in moon-features-source.json.
- 792 inverse texture/marker coordinate comparisons across rotations,
  pitches and zooms; near/far and dark-side hiding, exact feature centering,
  bounded marker picking and priority/collision handling. DOM checks cover
  the 41-option selector, point selection, cancellation, two-pointer rejection,
  hidden markers and reset.
- Real Chromium 154/SwiftShader checks in 390×844 portrait and 844×390
  landscape, with 2× screen density: solar motion/glow, one cached projection
  across changing frames, native pause/rebuild, offscreen stop, reduced motion
  and deliberately missing texture; lunar near/far centering and detail layout;
  immersive portrait/landscape bounds, hidden/visible controls, preserved
  far-side lunar selection, visible texture failure, legacy AR calibration
  migration, width slider, >110-degree AR field, parameter source copy and
  reset using a stand-in native bridge. No page errors. A Noto CJK font was
  loaded for a follow-up desktop layout check; Android font rendering remains
  unverified.
- Additional real-browser sequences open Moon, Jupiter and Saturn in both
  portrait and landscape, rotate/zoom by keyboard, switch controls and close
  or Escape before immediately opening the next view. Full-disc bounds,
  retained zoom, loaded textures and populated background snapshots pass;
  no page errors. This sequence reproduced the stale-close bug before the fix.
- Fullscreen detail layout keeps landscape controls in a separate scrollable
  panel. Covered chart rendering is skipped and restored when details close.
- Existing original artwork/HIP anchors, galaxy/grid alignment, gestures,
  astronomy, phase and Saturn ring rendering tests remain passing.

The release workflow requires the pure Java camera checks, Android compilation,
bundled-asset checks including immersive-view resources, camera calibration,
the solar renderer and
40 lunar records, and verification against
the fixed signing certificate before publishing. The matching GitHub Actions
run records the release result.

No Android-device visual, sensor/AR alignment, frame rate, memory or power
claim is made. Desktop checks cannot establish Android performance. Solar
animation is original artwork, not current activity; lunar directory markers
are reference centers, not scientific terrain boundaries. Private signing
material is excluded from the source.

Camera field-angle metadata is handled as optional, consistent with the
Android Camera.Parameters documentation (absent angles may return -1):
https://developer.android.com/reference/android/hardware/Camera.Parameters
No lens distortion correction or optical/device-specific calibration is claimed.
