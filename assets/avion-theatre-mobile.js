/**
 * avion-theatre-mobile.js — Theatre.js controller for MOBILE camera only
 *
 * ─── EDIT MODE ────────────────────────────────────────────────────────────
 *  1. Open your store with  ?theatre-mobile  in the URL.
 *     Tip: in Chrome DevTools, enable mobile emulation (Cmd+Shift+M / F12)
 *     so you can see the mobile framing live while you adjust.
 *
 *  2. The Theatre.js Studio panel appears.
 *     Expand the "Camera" object and adjust:
 *       position.x / y / z  — where the camera sits in 3D space
 *       target.x / y / z    — the point the camera looks at
 *       fov                  — field of view (degrees)
 *
 *  3. Changes apply live to the canvas. No reload needed.
 *
 *  4. When happy, run in the DevTools console:
 *       __exportMobileCamState()
 *     Copy the JSON that appears.
 *
 *  5. Paste into:
 *       Shopify → Avion Mobile Camera section → "Mobile Camera State JSON" → Save
 *
 * ─── PRODUCTION ────────────────────────────────────────────────────────────
 *  Studio is never loaded unless  ?theatre-mobile  is in the URL.
 *  The saved state is applied only on screens narrower than 768 px.
 *  On desktop the camera is driven by the main  avion-theatre.js  as usual.
 */

(async () => {

  /* ── Load @theatre/core ───────────────────────────────────────────────────── */
  let getProject, val, types;
  try {
    const mod  = await import('https://esm.sh/@theatre/core@0.7.2');
    const core = (typeof mod.getProject === 'function') ? mod : (mod.default ?? mod);
    getProject = core.getProject;
    val        = core.val;
    types      = core.types;
    if (typeof getProject !== 'function') throw new Error('getProject not found. Keys: ' + Object.keys(mod));
  } catch (err) {
    console.error('[AvionMobileCam] Failed to load @theatre/core:', err);
    return;
  }

  /* ── Studio (only when ?theatre-mobile is in the URL) ────────────────────── */
  const useStudio = new URLSearchParams(location.search).has('theatre-mobile');
  if (useStudio) {
    try {
      const studioMod = await import('https://esm.sh/@theatre/studio@0.7.2');
      const studio    = studioMod.default ?? studioMod;
      studio.initialize();
    } catch (err) {
      console.warn('[AvionMobileCam] Studio load failed:', err);
    }
  }

  /* ── Project + sheet ──────────────────────────────────────────────────────── */
  const savedState = window.AvionHero?.theatreStateMobile;
  const hasState   = savedState && Object.keys(savedState).length > 0;

  const project = getProject('Avion Mobile Camera', { state: hasState ? savedState : undefined });
  const sheet   = project.sheet('Mobile Camera');

  /* ── Camera object ────────────────────────────────────────────────────────── */
  // Defaults match the existing mobile fallback in avion-hero.js (Il=2.8, Pl=−0.08, Zi=4.8)
  const oCam = sheet.object('Camera', {
    position: {
      x: types.number( 2.80, { range: [-50, 50] }),
      y: types.number(-0.08, { range: [-20, 20] }),
      z: types.number( 4.80, { range: [-50, 50] }),
    },
    target: {
      x: types.number(0, { range: [-20, 20] }),
      y: types.number(0, { range: [-20, 20] }),
      z: types.number(0, { range: [-20, 20] }),
    },
    fov: types.number(50, { range: [10, 120] }),
  });

  /* ── Tick: write to __AvionCamMobile every frame ─────────────────────────── */
  const tick = () => {
    const v = val(oCam.props);
    window.__AvionCamMobile = {
      position: { x: v.position.x, y: v.position.y, z: v.position.z },
      target:   { x: v.target.x,   y: v.target.y,   z: v.target.z   },
      fov:      v.fov,
    };
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  /* ── Export helper ────────────────────────────────────────────────────────── */
  if (useStudio) {
    window.__exportMobileCamState = () => {
      const json = JSON.stringify(project.getState(), null, 2);
      console.log(
        '%c[AvionMobileCam]  Copy the JSON below → Shopify → "Avion Mobile Camera" section → "Mobile Camera State JSON" → Save',
        'background:#0ea5e9;color:#fff;padding:4px 10px;font-weight:bold;font-size:13px'
      );
      console.log(json);
    };

    console.info(
      '%c[AvionMobileCam] Studio ready!\n\n' +
      '  Object in the sheet:\n' +
      '    Camera  —  position XYZ  ·  target XYZ  ·  fov\n\n' +
      '  Workflow:\n' +
      '    1. Toggle Chrome mobile emulation  (Cmd+Shift+M)\n' +
      '    2. Expand "Camera" in the Studio panel, tweak values\n' +
      '    3. Changes apply live to the 3D scene\n' +
      '    4. Run  __exportMobileCamState()  in this console\n' +
      '    5. Paste the JSON → Shopify → Avion Mobile Camera → "Mobile Camera State JSON"\n',
      'color:#0ea5e9;font-weight:bold;font-size:12px'
    );
  }

})();
