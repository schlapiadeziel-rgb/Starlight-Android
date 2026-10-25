# Starlight 0.3.40 verification — 2026-10-24

Implemented demand-driven chart invalidation, coalesced/throttled frames,
one maintenance deadline for astronomy/clock/ISS, lifecycle cancellation,
stale-sky refresh on resume, sample-location ISS gating and correct help version.

Passed:
- All 33 Node scripts via npm test, retaining the previous 31 suites.
- Runtime fake-clock tests: 10000 invalidations coalesce; no extra idle frames;
  one maintenance deadline; responsive bounded drawing under 60Hz input;
  pause cancels frames/timers; stale callbacks cannot restart work; resume,
  disposal and wall-clock rollback pass.
- Full-app fake clock: no intervals or idle frames, correct minute boundary,
  no chart work over ten paused minutes, immediate astronomy refresh on resume,
  8s ISS refresh, 12s snapshot expiry, no refresh after closing ISS or using
  sample coordinates. Help version agrees with app/build.gradle.
- Chrome for Testing 151 headless shell / SwiftShader, 2x density, Shanghai
  timezone, 390x844 portrait and 844x390 landscape. Old 0.3.36 and new assets
  use the same browser, viewport, fixed chart time, and 2s idle measurement:
    portrait: old 120 requested animation frames, new 0;
    landscape: old 121 requested animation frames, new 0.
  Counts measure requestAnimationFrame scheduling, NOT rendered FPS, CPU
  percentage, power usage, physical-device responsiveness or battery life.
- Browser zoom/drag, pause/resume, help version, nine atlas thumbnails, Moon /
  Venus / Saturn default viewport bounds and rotation/zoom pass in both layouts.
  Mocked ISS sample-location gating, saved-snapshot navigation/expiry and the
  unsupported reminder preview pass. No page errors.
- Existing pure Java checks: 432 camera/chart ray comparisons and 29 reminder
  timing/expiry boundaries pass. Native reminder implementation is unchanged.
- Direct SDK build with Temurin JDK 17.0.21+9, Android SDK 35 / Build Tools
  35.0.0: AAPT2, javac, D8, zipalign and apksigner succeed. Gradle and GitHub
  workflow were not executed here.
- APK org.starlight.free, 0.3.40 / 49, minimum API 26, target API 35; v2 and v3
  verification pass with original certificate SHA256:
  3EA20712AB847EE5E2247CD5D4673BFA5A5467071A654E5E6066DA42A4867558.
- All 151 offline assets match packaged APK bytes, including runtime.js and
  all 85 constellation images; ZIP integrity passes. No private signing material
  is packaged. Source archive excludes temporary tools and build outputs.

No Android-device CPU, FPS, battery, memory, sensor alignment or background
notification measurements were made. Runtime queue tests and desktop browser
checks cannot establish Android performance or Night Sky equivalence. Native
notification/boot/doze behavior still needs physical-device verification.
No public GitHub write was attempted; publication remains pending.
