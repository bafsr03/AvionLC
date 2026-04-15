/**
 * avion-theatre.js — Theatre.js camera controller for the Avion 3D hero
 *
 * USAGE — edit mode:
 *   Add ?theatre to the URL, e.g. https://yourstore.myshopify.com/?theatre
 *   The Studio panel opens. Scrub the page to scrub the timeline.
 *   Set keyframes on the Camera object in the Studio panel.
 *   When done, run  __exportAvionState()  in the console and paste the
 *   JSON into Shopify → Avion 3D Hero section → "Theatre state JSON".
 *
 * USAGE — production:
 *   Studio is NOT loaded unless ?theatre is in the URL — zero overhead.
 */

(async () => {

  /* ─── load @theatre/core ───────────────────────────────────────────────
     esm.sh sometimes wraps CJS modules under .default instead of exposing
     named exports directly. We resolve both patterns.                     */
  let getProject, val;
  try {
    const mod = await import('https://esm.sh/@theatre/core@0.7.2');
    // Pattern A: named exports (pure ESM build)
    // Pattern B: everything under .default (CJS-wrapped build)
    const core = (typeof mod.getProject === 'function') ? mod : mod.default;
    getProject = core.getProject;
    val        = core.val;

    if (typeof getProject !== 'function') {
      console.error('[AvionTheatre] @theatre/core loaded but getProject not found. Module keys:', Object.keys(mod));
      return;
    }
  } catch (err) {
    console.error('[AvionTheatre] Failed to load @theatre/core:', err);
    return;
  }

  /* ─── Studio (only when ?theatre is in the URL) ────────────────────── */
  const useStudio = new URLSearchParams(location.search).has('theatre');
  if (useStudio) {
    try {
      const studioMod = await import('https://esm.sh/@theatre/studio@0.7.2');
      const studio = studioMod.default ?? studioMod;
      studio.initialize();
    } catch (err) {
      console.warn('[AvionTheatre] Studio failed to load:', err);
    }
  }

  /* ─── Saved state (injected from Shopify section setting) ─────────── */
  const savedState = window.AvionHero?.theatreState || null;
  const hasState   = savedState && Object.keys(savedState).length > 0;

  /* ─── Project + sheet + camera object ─────────────────────────────── */
  const project = getProject('Avion Hero', {
    state: hasState ? savedState : undefined
  });
  const sheet = project.sheet('Camera Path');

  // Default pose = desktop fallback camera in avion-hero.js
  // (angle 19°, radius 3.8, x -0.02, y -0.26 → gives z ≈ 3.6)
  const camObj = sheet.object('Camera', {
    position: { x: -0.02, y: -0.26, z: 3.60 },
    target:   { x: 0,     y: 0,     z: 0    },
    fov:      50
  });

  /* ─── Sequence length ──────────────────────────────────────────────── */
  // 10 seconds covers full scroll (window.__AvionXs goes 0 → 1).
  // More seconds = more room to place keyframes.
  const SEQ_DURATION = 10;

  /* ─── Sync loop: scroll → timeline → camera props ─────────────────── */
  const tick = () => {
    sheet.sequence.position = (window.__AvionXs ?? 0) * SEQ_DURATION;
    window.__AvionCamProps  = val(camObj.props);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* ─── Dev helpers (Studio mode only) ──────────────────────────────── */
  if (useStudio) {
    window.__exportAvionState = () => {
      const json = JSON.stringify(project.getState(), null, 2);
      console.log(
        '%c[AvionTheatre] Copy this JSON and paste into:\n' +
        'Shopify Admin → Themes → Customize → Avion 3D Hero → "Theatre state JSON"',
        'color:#6d28d9;font-weight:bold;font-size:13px'
      );
      console.log(json);
    };

    console.info(
      '%c[AvionTheatre] Studio active!\n\n' +
      '  1. Scroll to a position on the page\n' +
      '  2. In the Studio panel (bottom), select "Camera Path > Camera"\n' +
      '  3. Right-click a prop (position.x etc.) → Add keyframe\n' +
      '  4. Adjust the value in the panel on the right\n' +
      '  5. Scroll to another position and repeat\n' +
      '  6. Run __exportAvionState() in this console when done\n' +
      '  7. Paste the JSON into the Shopify theme editor\n',
      'color:#6d28d9;font-weight:bold;font-size:12px'
    );
  }

})();
