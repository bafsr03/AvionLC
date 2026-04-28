/**
 * avion-theatre.js — Theatre.js controller for camera + full scene
 *
 * ─── EDIT MODE ────────────────────────────────────────────────────────────
 *  1. Open your store with  ?theatre  in the URL:
 *       http://127.0.0.1:9292/?theatre
 *
 *  2. The Studio panel appears at the bottom.
 *     Objects you can keyframe:
 *       Camera        — position XYZ, target XYZ, fov
 *       Atmosphere    — fog density, fog colour, background colour
 *       Ambient Light — colour, intensity
 *       Sun Light     — colour, intensity, position XYZ
 *       Fill Light    — colour, intensity, position XYZ
 *       Sky (Hemi)    — sky colour, ground colour, intensity
 *       Post FX       — exposure, bloom strength, bloom radius, bloom threshold
 *       Stars         — opacity, size
 *       Clouds        — opacity
 *       Particles     — opacity, size
 *
 *  3. Scroll the page to scrub the timeline.
 *     Right-click any prop value → "Add keyframe at position".
 *     Drag the keyframe diamond to adjust timing.
 *
 *  4. When done, run in the DevTools console:
 *       __exportAvionState()
 *     Copy the JSON that appears.
 *
 *  5. Paste into:
 *       Shopify → Avion 3D Hero section → "Theatre state JSON" → Save
 *
 * ─── PRODUCTION ────────────────────────────────────────────────────────────
 *  Studio is never loaded unless  ?theatre  is in the URL.
 *  The saved state JSON is loaded from the section setting and applied live.
 */

(async () => {

  /* ── Load @theatre/core ─────────────────────────────────────────────────── */
  let getProject, val, types;
  try {
    const mod = await import('https://esm.sh/@theatre/core@0.7.2');
    const core = (typeof mod.getProject === 'function') ? mod : (mod.default ?? mod);
    getProject = core.getProject;
    val        = core.val;
    types      = core.types;
    if (typeof getProject !== 'function') throw new Error('getProject not found. Keys: ' + Object.keys(mod));
  } catch (err) {
    console.error('[AvionTheatre] Failed to load @theatre/core:', err);
    return;
  }

  /* ── Studio (only when ?theatre is in the URL) ──────────────────────────── */
  const useStudio = new URLSearchParams(location.search).has('theatre');
  if (useStudio) {
    try {
      const studioMod = await import('https://esm.sh/@theatre/studio@0.7.2');
      const studio = studioMod.default ?? studioMod;
      studio.initialize();
    } catch (err) {
      console.warn('[AvionTheatre] Studio load failed:', err);
    }
  }

  /* ── Project + sheet ────────────────────────────────────────────────────── */
  const savedState = window.AvionHero?.theatreState;
  const hasState   = savedState && Object.keys(savedState).length > 0;

  const project = getProject('Avion Hero', { state: hasState ? savedState : undefined });
  const sheet   = project.sheet('Scene');
  const mobileSheet = project.sheet('Mobile Camera');

  const SEQ_DURATION = 10; // seconds — maps to scroll 0 → 1

  /* ── Helper: Theatre.js rgba type (colour picker in Studio) ─────────────── */
  // rgba values are 0–1. Three.js Color.setRGB() also uses 0–1. Perfect match.
  const rgba = (r, g, b) => types.rgba({ r, g, b, a: 1 });

  /* ── Objects — one per category ─────────────────────────────────────────── */

  // Camera
  const oCam = sheet.object('Camera', {
    position: {
      x: types.number(-0.02, { range: [-50, 50] }),
      y: types.number(-0.26, { range: [-20, 20] }),
      z: types.number( 3.60, { range: [-50, 50] }),
    },
    target: {
      x: types.number(0, { range: [-20, 20] }),
      y: types.number(0, { range: [-20, 20] }),
      z: types.number(0, { range: [-20, 20] }),
    },
    fov: types.number(50, { range: [10, 120] }),
  });

  // ── Mobile Camera (< 768 px) — separate sheet so desktop is untouched ──────
  const oMobileCam = mobileSheet.object('Camera', {
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

  // Atmosphere
  const oAtm = sheet.object('Atmosphere', {
    fogDensity: types.number(0.006, { range: [0, 0.05] }),
    fogColor:   rgba(0.78, 0.83, 0.63),
    bgColor:    rgba(0.62, 0.68, 0.41),
  });

  // Ambient light
  const oAmb = sheet.object('Ambient Light', {
    color:     rgba(0.63, 0.66, 0.69),
    intensity: types.number(2.5, { range: [0, 10] }),
  });

  // Sun (directional)
  const oSun = sheet.object('Sun Light', {
    color:     rgba(1.00, 0.96, 0.88),
    intensity: types.number(6.5, { range: [0, 20] }),
    posX:      types.number( 40, { range: [-150, 150] }),
    posY:      types.number( 80, { range: [-150, 150] }),
    posZ:      types.number(-20, { range: [-150, 150] }),
  });

  // Fill (secondary directional)
  const oFill = sheet.object('Fill Light', {
    color:     rgba(0.94, 0.85, 0.75),
    intensity: types.number(1.5, { range: [0, 10] }),
    posX:      types.number(-15, { range: [-100, 100] }),
    posY:      types.number( -5, { range: [-100, 100] }),
    posZ:      types.number( 12, { range: [-100, 100] }),
  });

  // Hemisphere sky / ground
  const oHemi = sheet.object('Sky (Hemi)', {
    skyColor:    rgba(0.62, 0.68, 0.41),
    groundColor: rgba(0.78, 0.83, 0.63),
    intensity:   types.number(1.2, { range: [0, 10] }),
  });

  // Post processing
  const oPost = sheet.object('Post FX', {
    exposure:       types.number(0.85,  { range: [0, 5]  }),
    bloomStrength:  types.number(0.25, { range: [0, 3]  }),
    bloomRadius:    types.number(0.3,  { range: [0, 1]  }),
    bloomThreshold: types.number(0.95, { range: [0, 1]  }),
  });

  // Stars
  const oStars = sheet.object('Stars', {
    opacity: types.number(0,    { range: [0, 1]  }),
    size:    types.number(0.28, { range: [0.05, 2] }),
  });

  // Clouds
  const oClouds = sheet.object('Clouds', {
    opacity: types.number(0.7, { range: [0, 1] }),
  });

  // Particles / rain
  const oParts = sheet.object('Particles', {
    opacity: types.number(0.2,  { range: [0, 1]  }),
    size:    types.number(0.06, { range: [0.01, 1] }),
  });

  /* ── Listeners: Theatre → Three (Direct Mapping) ────────────────────────── */
  
  // Camera desktop
  oCam.onValuesChange((v) => { window.__AvionCamProps = v; });

  // Camera mobile
  oMobileCam.onValuesChange((mv) => {
    window.__AvionCamMobile = {
      position: { x: mv.position.x, y: mv.position.y, z: mv.position.z },
      target:   { x: mv.target.x,   y: mv.target.y,   z: mv.target.z   },
      fov:      mv.fov,
    };
  });

  // Atmosphere
  oAtm.onValuesChange((v) => {
    const S = window.__AvionScene;
    if (!S) return;
    if (S.fog) {
      S.fog.density = v.fogDensity;
      S.fog.color.setRGB(v.fogColor.r, v.fogColor.g, v.fogColor.b);
    }
    if (!S.scene.background?.isTexture) S.scene.background.setRGB(v.bgColor.r, v.bgColor.g, v.bgColor.b);
  });

  // Lights
  oAmb.onValuesChange((v) => {
    const S = window.__AvionScene;
    if (S?.ambient) {
      S.ambient.intensity = v.intensity;
      S.ambient.color.setRGB(v.color.r, v.color.g, v.color.b);
    }
  });

  oSun.onValuesChange((v) => {
    const S = window.__AvionScene;
    if (S?.sun) {
      S.sun.intensity = v.intensity;
      S.sun.color.setRGB(v.color.r, v.color.g, v.color.b);
      S.sun.position.set(v.posX, v.posY, v.posZ);
    }
  });

  oFill.onValuesChange((v) => {
    const S = window.__AvionScene;
    if (S?.fill) {
      S.fill.intensity = v.intensity;
      S.fill.color.setRGB(v.color.r, v.color.g, v.color.b);
      S.fill.position.set(v.posX, v.posY, v.posZ);
    }
  });

  oHemi.onValuesChange((v) => {
    const S = window.__AvionScene;
    if (S?.hemi) {
      S.hemi.intensity = v.intensity;
      S.hemi.color.setRGB(v.skyColor.r, v.skyColor.g, v.skyColor.b);
      S.hemi.groundColor.setRGB(v.groundColor.r, v.groundColor.g, v.groundColor.b);
    }
  });

  // Post FX
  oPost.onValuesChange((v) => {
    const S = window.__AvionScene;
    if (S?.renderer) S.renderer.toneMappingExposure = v.exposure;
    if (S?.bloom) {
      S.bloom.strength = v.bloomStrength;
      S.bloom.radius = v.bloomRadius;
      S.bloom.threshold = v.bloomThreshold;
    }
  });

  // Environment elements
  oStars.onValuesChange((v) => {
    window.__AvionStarsOpacity = v.opacity;
    if (window.__AvionScene?.starsMat) window.__AvionScene.starsMat.size = v.size;
  });

  oClouds.onValuesChange((v) => { window.__AvionCloudMult = v.opacity; });

  oParts.onValuesChange((v) => {
    window.__AvionParticlesOpacity = v.opacity;
    if (window.__AvionScene?.particlesMat) window.__AvionScene.particlesMat.size = v.size;
  });

  /* ── Readiness ──────────────────────────────────────────────────────────── */
  project.ready.then(() => {
    console.log('[AvionTheatre] Project Ready. Enabling updates.');
    
    /* ── Expose Sequence function for avion-hero.js ────────────────────────── */
    window.__AvionUpdateTheatre = (currentXs) => {
      sheet.sequence.position = currentXs * SEQ_DURATION;
    };
  });

  /* ── Export helper ───────────────────────────────────────────────────────── */
  if (useStudio) {
    window.__exportAvionState = () => {
      const json = JSON.stringify(project.getState(), null, 2);
      console.log(
        '%c[AvionTheatre]  Copy this JSON → Shopify → Avion 3D Hero → "Theatre state JSON"',
        'background:#6d28d9;color:#fff;padding:4px 10px;font-weight:bold;font-size:13px'
      );
      console.log(json);
    };

    console.info(
      '%c[AvionTheatre] Studio ready!\n\n' +
      '  Sheet: Scene  (desktop)\n' +
      '    Camera · Atmosphere · Ambient Light · Sun Light\n' +
      '    Fill Light · Sky (Hemi) · Post FX\n' +
      '    Stars · Clouds · Particles\n\n' +
      '  Sheet: Mobile Camera  (< 768 px only)\n' +
      '    Camera — position XYZ · target XYZ · fov\n\n' +
      '  Workflow:\n' +
      '    1. Select the sheet you want in the Studio top-bar\n' +
      '    2. Expand an object, right-click a value → Add keyframe\n' +
      '    3. Adjust the value — changes apply live\n' +
      '    4. Run  __exportAvionState()  when done\n',
      'color:#6d28d9;font-weight:bold;font-size:12px'
    );
  }

})();
