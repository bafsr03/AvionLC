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
    exposure:       types.number(1.5,  { range: [0, 5]  }),
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

  // Animation Timing — values are 0–1 (fraction of total scroll)
  const oAnimTiming = sheet.object('Animation Timing', {
    airplane_start: types.number(0.00, { range: [0, 1] }),
    airplane_end:   types.number(0.85, { range: [0, 1] }),
    drop_start:     types.number(0.35, { range: [0, 1] }),
    drop_end:       types.number(0.75, { range: [0, 1] }),
  });

  /* ── Tick: scroll → timeline → apply all props ──────────────────────────── */
  const tick = () => {
    // Advance Theatre.js sequence to match scroll
    sheet.sequence.position = (window.__AvionXs ?? 0) * SEQ_DURATION;

    // ── Camera ──────────────────────────────────────────────────────────────
    window.__AvionCamProps = val(oCam.props);

    // ── Animation Timing — update mixer start/end each frame ────────────────
    const anim = val(oAnimTiming.props);
    const mixers = window.__AvionMixers;
    if (mixers) {
      if (mixers[0]) { mixers[0].s = anim.airplane_start; mixers[0].n = anim.airplane_end; }
      if (mixers[1]) { mixers[1].s = anim.drop_start;     mixers[1].n = anim.drop_end; }
    }

    // ── Scene objects (available once avion-hero.js has set up the scene) ──
    const S = window.__AvionScene;
    if (S) {
      const atm   = val(oAtm.props);
      const amb   = val(oAmb.props);
      const sun   = val(oSun.props);
      const fill  = val(oFill.props);
      const hemi  = val(oHemi.props);
      const post  = val(oPost.props);
      const stars = val(oStars.props);
      const clouds= val(oClouds.props);
      const parts = val(oParts.props);

      // Atmosphere
      if (S.fog) {
        S.fog.density = atm.fogDensity;
        S.fog.color.setRGB(atm.fogColor.r, atm.fogColor.g, atm.fogColor.b);
      }
      if (!S.scene.background?.isTexture) {
        S.scene.background.setRGB(atm.bgColor.r, atm.bgColor.g, atm.bgColor.b);
      }

      // Lights
      S.ambient.intensity = amb.intensity;
      S.ambient.color.setRGB(amb.color.r, amb.color.g, amb.color.b);

      S.sun.intensity = sun.intensity;
      S.sun.color.setRGB(sun.color.r, sun.color.g, sun.color.b);
      S.sun.position.set(sun.posX, sun.posY, sun.posZ);

      S.fill.intensity = fill.intensity;
      S.fill.color.setRGB(fill.color.r, fill.color.g, fill.color.b);
      S.fill.position.set(fill.posX, fill.posY, fill.posZ);

      S.hemi.intensity = hemi.intensity;
      S.hemi.color.setRGB(hemi.skyColor.r, hemi.skyColor.g, hemi.skyColor.b);
      S.hemi.groundColor.setRGB(hemi.groundColor.r, hemi.groundColor.g, hemi.groundColor.b);

      // Post processing
      S.renderer.toneMappingExposure = post.exposure;
      S.bloom.strength  = post.bloomStrength;
      S.bloom.radius    = post.bloomRadius;
      S.bloom.threshold = post.bloomThreshold;

      // Stars / clouds / particles (written to globals, render loop reads them)
      window.__AvionStarsOpacity    = stars.opacity;
      S.starsMat.size               = stars.size;
      window.__AvionCloudMult       = clouds.opacity;
      window.__AvionParticlesOpacity = parts.opacity;
      S.particlesMat.size           = parts.size;
    }

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

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
      '  Objects in the sheet:\n' +
      '    Camera · Atmosphere · Ambient Light · Sun Light\n' +
      '    Fill Light · Sky (Hemi) · Post FX\n' +
      '    Stars · Clouds · Particles\n\n' +
      '  Workflow:\n' +
      '    1. Scroll to a position\n' +
      '    2. Expand an object in Studio, right-click a value → Add keyframe\n' +
      '    3. Adjust the value — changes apply live\n' +
      '    4. Repeat at other scroll positions to animate\n' +
      '    5. Run  __exportAvionState()  when done\n',
      'color:#6d28d9;font-weight:bold;font-size:12px'
    );
  }

})();
