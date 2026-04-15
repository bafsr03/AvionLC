/**
 * avion-theatre.js — Theatre.js camera controller for the Avion 3D hero
 *
 * USAGE — edit mode:
 *   Add ?theatre to the URL, e.g. https://yourstore.myshopify.com/?theatre
 *   The Studio panel opens. Scrub the timeline = scrub scroll.
 *   Set keyframes on Camera → position / target / fov.
 *   When done, run  __exportAvionState()  in the console,
 *   copy the JSON and paste it into the "Theatre state JSON" setting
 *   in the Avion 3D Hero section in Shopify theme editor.
 *
 * USAGE — production:
 *   Export your state JSON → paste into section setting → save theme.
 *   Studio is NOT loaded in production (no ?theatre param = zero overhead).
 */

(async () => {
  /* ── Theatre.js core (always loaded) ─────────────────────────────────── */
  let getProject, val;
  try {
    ({ getProject, val } = await import('https://esm.sh/@theatre/core@0.7'));
  } catch (err) {
    console.error('[AvionTheatre] Failed to load @theatre/core:', err);
    return;
  }

  /* ── Studio (only when ?theatre is in the URL) ────────────────────────── */
  const useStudio = new URLSearchParams(location.search).has('theatre');
  if (useStudio) {
    try {
      const { default: studio } = await import('https://esm.sh/@theatre/studio@0.7');
      studio.initialize();
    } catch (err) {
      console.warn('[AvionTheatre] Studio failed to load:', err);
    }
  }

  /* ── Load saved state ─────────────────────────────────────────────────── */
  // State is injected by avion-threejs-hero.liquid via window.AvionHero.theatreState
  const savedState = window.AvionHero?.theatreState || null;

  /* ── Project + sheet + camera object ─────────────────────────────────── */
  const project = getProject('Avion Hero', {
    state: savedState ?? undefined
  });
  const sheet = project.sheet('Camera Path');

  // Default pose matches the JS fallback camera (desktop, no GLB camera)
  const camObj = sheet.object('Camera', {
    position: {
      x: -0.02,
      y: -0.26,
      z:  3.80
    },
    target: {
      x: 0,
      y: 0,
      z: 0
    },
    fov: 50
  });

  /* ── Sequence setup ───────────────────────────────────────────────────── */
  // SEQ_DURATION seconds represents full scroll travel (Xs goes 0 → 1)
  // Increase for more keyframe resolution; keep in sync with your edits.
  const SEQ_DURATION = 10;

  /* ── Sync loop: map scroll → timeline, push values to camera ─────────── */
  const tick = () => {
    const xs = window.__AvionXs ?? 0;

    // Drive Theatre.js timeline from scroll progress
    sheet.sequence.position = xs * SEQ_DURATION;

    // Push current interpolated values into the render hook
    window.__AvionCamProps = val(camObj.props);

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* ── Dev helpers (only in Studio mode) ───────────────────────────────── */
  if (useStudio) {
    /**
     * Run __exportAvionState() in the DevTools console after editing
     * keyframes. Copy the printed JSON and paste it into the Shopify
     * theme editor → "Avion 3D Hero" section → "Theatre state JSON".
     */
    window.__exportAvionState = () => {
      const state = project.getState();
      const json = JSON.stringify(state, null, 2);
      console.log(
        '%c[AvionTheatre] ── Copy this JSON ──────────────────────────────────\n' +
        'Paste into Shopify: Avion 3D Hero section → "Theatre state JSON"\n' +
        '─────────────────────────────────────────────────────────────────',
        'color:#6d28d9;font-weight:bold;font-size:13px'
      );
      console.log(json);
    };

    console.info(
      '%c[AvionTheatre] Studio is active 🎬\n\n' +
      '  1. Scroll the page to scrub the Theatre.js timeline\n' +
      '  2. Select the "Camera" object in the Studio panel\n' +
      '  3. Press Space or click the diamond icon to add a keyframe\n' +
      '  4. Adjust position / target / fov in the Props panel\n' +
      '  5. Repeat at different scroll positions to build the path\n' +
      '  6. When done: run  __exportAvionState()  in this console\n' +
      '  7. Paste the output into Shopify → Avion 3D Hero → Theatre state JSON\n',
      'color:#6d28d9;font-weight:bold;font-size:12px'
    );
  }
})();
