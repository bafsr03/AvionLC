/**
 * avion-edit.js — Live scene editor for the Avion 3D hero
 *
 * HOW TO USE
 * ──────────
 * 1. Open your store URL with ?edit added:
 *      http://127.0.0.1:9292/?edit
 *      https://your-store.myshopify.com/?edit
 *
 * 2. A floating panel appears — adjust anything live.
 *    Folders you can edit:
 *      🌤 Atmosphere    — background colour, fog colour & density
 *      💡 Ambient       — fill-everywhere light colour & intensity
 *      ☀️  Sun           — directional light colour, intensity, position XYZ
 *      🔆 Fill          — secondary directional light
 *      🌈 Sky (Hemi)    — hemisphere sky/ground colours & intensity
 *      ✨ Post FX        — tone-mapping exposure, bloom strength/radius/threshold
 *      ⭐ Stars          — opacity & particle size
 *      ☁️  Clouds        — global opacity multiplier
 *      🌧 Particles     — rain/dust opacity & size
 *      🎬 Anim Timing   — per-animation scroll start/end %
 *
 * 3. When you're happy, click  "📋 Export Config"  at the bottom.
 *    Copy the JSON from the console.
 *
 * 4. Paste into:
 *      Shopify Admin → Online Store → Themes → Customize
 *      → Avion 3D Hero section → "Scene Config JSON" field → Save
 *
 *    For animation timing: update the four sliders in the same section.
 */

(async () => {

  /* ── Wait for avion-hero.js to expose __AvionScene ─────────────────────── */
  let S;
  for (let i = 0; i < 80; i++) {
    if (window.__AvionScene) { S = window.__AvionScene; break; }
    await new Promise(r => setTimeout(r, 100));
  }
  if (!S) {
    console.error('[AvionEdit] __AvionScene not available. Is avion-hero.js loaded?');
    return;
  }

  /* ── Load Tweakpane (UMD → sets window.Tweakpane) ───────────────────────── */
  await new Promise((ok, fail) => {
    const s = Object.assign(document.createElement('script'), {
      src: 'https://cdn.jsdelivr.net/npm/tweakpane@4.0.5/dist/tweakpane.min.js',
      onload: ok,
      onerror: fail
    });
    document.head.appendChild(s);
  });

  if (!window.Tweakpane) {
    console.error('[AvionEdit] Tweakpane failed to load.');
    return;
  }
  const { Pane } = window.Tweakpane;

  /* ── Colour helpers (Three.js Color ↔ {r,g,b} 0-255) ─────────────────── */
  const toRGB  = c => ({ r: Math.round(c.r * 255), g: Math.round(c.g * 255), b: Math.round(c.b * 255) });
  const applyRGB = (threeColor, { r, g, b }) => threeColor.setRGB(r / 255, g / 255, b / 255);
  const rgbHex = ({ r, g, b }) =>
    '#' + [r, g, b].map(n => Math.round(n).toString(16).padStart(2, '0')).join('');

  /* ── Params — mirror of the live scene ────────────────────────────────── */
  const bgIsTexture = S.scene.background?.isTexture;
  const P = {

    /* Atmosphere */
    bgColor:    bgIsTexture ? { r: 158, g: 173, b: 104 } : toRGB(S.scene.background),
    fogColor:   toRGB(S.fog.color),
    fogDensity: S.fog.density,

    /* Ambient */
    ambColor:     toRGB(S.ambient.color),
    ambIntensity: S.ambient.intensity,

    /* Sun (directional) */
    sunColor:     toRGB(S.sun.color),
    sunIntensity: S.sun.intensity,
    sunX: S.sun.position.x,
    sunY: S.sun.position.y,
    sunZ: S.sun.position.z,

    /* Fill (secondary directional) */
    fillColor:     toRGB(S.fill.color),
    fillIntensity: S.fill.intensity,
    fillX: S.fill.position.x,
    fillY: S.fill.position.y,
    fillZ: S.fill.position.z,

    /* Hemisphere (sky / ground) */
    hemiSky:       toRGB(S.hemi.color),
    hemiGround:    toRGB(S.hemi.groundColor),
    hemiIntensity: S.hemi.intensity,

    /* Post processing */
    exposure:       S.renderer.toneMappingExposure,
    bloomStrength:  S.bloom.strength,
    bloomRadius:    S.bloom.radius,
    bloomThreshold: S.bloom.threshold,

    /* Stars */
    starsOpacity: window.__AvionStarsOpacity ?? 0,
    starsSize:    S.starsMat.size,

    /* Clouds */
    cloudsOpacity: window.__AvionCloudMult ?? 0.7,

    /* Particles / rain */
    particlesOpacity: window.__AvionParticlesOpacity ?? 0.2,
    particlesSize:    S.particlesMat.size,

    /* Animation timing  (stored as 0–100%) */
    anim0Start: Math.round((window.__AvionMixers?.[0]?.s ?? 0.00) * 100),
    anim0End:   Math.round((window.__AvionMixers?.[0]?.n ?? 0.85) * 100),
    anim1Start: Math.round((window.__AvionMixers?.[1]?.s ?? 0.35) * 100),
    anim1End:   Math.round((window.__AvionMixers?.[1]?.n ?? 0.75) * 100),
  };

  /* ── Build the panel ───────────────────────────────────────────────────── */
  const pane = new Pane({ title: '✈  Avion Scene Editor', expanded: true });

  /* Force the panel on top of the Three.js canvas */
  setTimeout(() => {
    const el = document.querySelector('.tp-dfwv') ?? document.querySelector('[class*="tp-"]');
    if (el) Object.assign(el.style, { zIndex: '99999', maxHeight: '90vh', overflowY: 'auto' });
  }, 50);

  /* Tiny helper: bind + live-update in one call */
  const bind = (folder, key, opts, fn) =>
    folder.addBinding(P, key, opts).on('change', ({ value }) => fn(value));

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 🌤  ATMOSPHERE                                                          */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fAtm = pane.addFolder({ title: '🌤  Atmosphere', expanded: false });
  if (bgIsTexture) fAtm.addBlade({ view: 'text', label: 'Background', value: '(EXR loaded — use Sky rotation)' });
  else bind(fAtm, 'bgColor', { label: 'Background colour' }, v => applyRGB(S.scene.background, v));
  bind(fAtm, 'fogColor',   { label: 'Fog colour'   }, v => applyRGB(S.fog.color, v));
  bind(fAtm, 'fogDensity', { label: 'Fog density', min: 0, max: 0.05, step: 0.0002 }, v => S.fog.density = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 💡  AMBIENT LIGHT                                                       */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fAmb = pane.addFolder({ title: '💡  Ambient Light', expanded: false });
  bind(fAmb, 'ambColor',     { label: 'Colour' },                                   v => applyRGB(S.ambient.color, v));
  bind(fAmb, 'ambIntensity', { label: 'Intensity', min: 0, max: 10, step: 0.05 },   v => S.ambient.intensity = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* ☀️   SUN (directional light)                                             */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fSun = pane.addFolder({ title: '☀️   Sun Light', expanded: false });
  bind(fSun, 'sunColor',     { label: 'Colour' },                                   v => applyRGB(S.sun.color, v));
  bind(fSun, 'sunIntensity', { label: 'Intensity',  min: 0, max: 20,   step: 0.1 }, v => S.sun.intensity = v);
  bind(fSun, 'sunX',         { label: 'Position X', min: -150, max: 150, step: 1 }, v => S.sun.position.x = v);
  bind(fSun, 'sunY',         { label: 'Position Y', min: -150, max: 150, step: 1 }, v => S.sun.position.y = v);
  bind(fSun, 'sunZ',         { label: 'Position Z', min: -150, max: 150, step: 1 }, v => S.sun.position.z = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 🔆  FILL LIGHT (secondary directional)                                  */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fFill = pane.addFolder({ title: '🔆  Fill Light', expanded: false });
  bind(fFill, 'fillColor',     { label: 'Colour' },                                   v => applyRGB(S.fill.color, v));
  bind(fFill, 'fillIntensity', { label: 'Intensity',  min: 0, max: 10,   step: 0.1 }, v => S.fill.intensity = v);
  bind(fFill, 'fillX',         { label: 'Position X', min: -100, max: 100, step: 1 }, v => S.fill.position.x = v);
  bind(fFill, 'fillY',         { label: 'Position Y', min: -100, max: 100, step: 1 }, v => S.fill.position.y = v);
  bind(fFill, 'fillZ',         { label: 'Position Z', min: -100, max: 100, step: 1 }, v => S.fill.position.z = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 🌈  SKY — HEMISPHERE LIGHT                                              */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fHemi = pane.addFolder({ title: '🌈  Sky (Hemisphere)', expanded: false });
  bind(fHemi, 'hemiSky',       { label: 'Sky colour'    }, v => applyRGB(S.hemi.color, v));
  bind(fHemi, 'hemiGround',    { label: 'Ground colour' }, v => applyRGB(S.hemi.groundColor, v));
  bind(fHemi, 'hemiIntensity', { label: 'Intensity', min: 0, max: 10, step: 0.1 }, v => S.hemi.intensity = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* ✨  POST PROCESSING                                                      */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fPost = pane.addFolder({ title: '✨  Post Processing', expanded: false });
  bind(fPost, 'exposure',       { label: 'Exposure',        min: 0,   max: 5, step: 0.01 }, v => S.renderer.toneMappingExposure = v);
  bind(fPost, 'bloomStrength',  { label: 'Bloom Strength',  min: 0,   max: 3, step: 0.01 }, v => S.bloom.strength = v);
  bind(fPost, 'bloomRadius',    { label: 'Bloom Radius',    min: 0,   max: 1, step: 0.01 }, v => S.bloom.radius = v);
  bind(fPost, 'bloomThreshold', { label: 'Bloom Threshold', min: 0,   max: 1, step: 0.01 }, v => S.bloom.threshold = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* ⭐  STARS                                                                */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fStars = pane.addFolder({ title: '⭐  Stars', expanded: false });
  bind(fStars, 'starsOpacity', { label: 'Opacity', min: 0, max: 1,    step: 0.01 }, v => window.__AvionStarsOpacity = v);
  bind(fStars, 'starsSize',    { label: 'Size',    min: 0.05, max: 2, step: 0.01 }, v => S.starsMat.size = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* ☁️   CLOUDS                                                              */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fClouds = pane.addFolder({ title: '☁️   Clouds', expanded: false });
  bind(fClouds, 'cloudsOpacity', { label: 'Opacity multiplier', min: 0, max: 1, step: 0.01 }, v => window.__AvionCloudMult = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 🌧  PARTICLES (rain / dust)                                             */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fParts = pane.addFolder({ title: '🌧  Particles', expanded: false });
  bind(fParts, 'particlesOpacity', { label: 'Opacity', min: 0, max: 1,    step: 0.01 }, v => window.__AvionParticlesOpacity = v);
  bind(fParts, 'particlesSize',    { label: 'Size',    min: 0.01, max: 1, step: 0.01 }, v => S.particlesMat.size = v);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 🎬  ANIMATION TIMING                                                    */
  /* ──────────────────────────────────────────────────────────────────────── */
  const fAnim = pane.addFolder({ title: '🎬  Animation Timing  (%)', expanded: false });
  const syncAnim = () => {
    const m = window.__AvionMixers;
    if (!m) return;
    if (m[0]) { m[0].s = P.anim0Start / 100; m[0].n = P.anim0End / 100; }
    if (m[1]) { m[1].s = P.anim1Start / 100; m[1].n = P.anim1End / 100; }
  };
  bind(fAnim, 'anim0Start', { label: 'Anim 1 (plane) start', min: 0, max: 100, step: 1 }, syncAnim);
  bind(fAnim, 'anim0End',   { label: 'Anim 1 (plane) end',   min: 0, max: 100, step: 1 }, syncAnim);
  bind(fAnim, 'anim1Start', { label: 'Anim 2 (drop)  start', min: 0, max: 100, step: 1 }, syncAnim);
  bind(fAnim, 'anim1End',   { label: 'Anim 2 (drop)  end',   min: 0, max: 100, step: 1 }, syncAnim);

  /* ──────────────────────────────────────────────────────────────────────── */
  /* 📋  EXPORT                                                               */
  /* ──────────────────────────────────────────────────────────────────────── */
  pane.addSeparator();
  pane.addButton({ title: '📋  Export Config  →  paste into Shopify' }).on('click', () => {

    /* Scene config JSON (goes into "Scene Config JSON" textarea) */
    const sceneConfig = {
      bgColor:        rgbHex(P.bgColor),
      fogColor:       rgbHex(P.fogColor),
      fogDensity:     P.fogDensity,
      ambColor:       rgbHex(P.ambColor),
      ambIntensity:   P.ambIntensity,
      sunColor:       rgbHex(P.sunColor),
      sunIntensity:   P.sunIntensity,
      sunPos:         { x: P.sunX, y: P.sunY, z: P.sunZ },
      fillColor:      rgbHex(P.fillColor),
      fillIntensity:  P.fillIntensity,
      fillPos:        { x: P.fillX, y: P.fillY, z: P.fillZ },
      hemiSky:        rgbHex(P.hemiSky),
      hemiGround:     rgbHex(P.hemiGround),
      hemiIntensity:  P.hemiIntensity,
      exposure:       P.exposure,
      bloomStrength:  P.bloomStrength,
      bloomRadius:    P.bloomRadius,
      bloomThreshold: P.bloomThreshold,
      starsOpacity:   P.starsOpacity,
      starsSize:      P.starsSize,
      cloudsOpacity:  P.cloudsOpacity,
      particlesOpacity: P.particlesOpacity,
      particlesSize:    P.particlesSize,
    };

    console.log(
      '%c[AvionEdit]  SCENE CONFIG — paste into Shopify → Avion 3D Hero → "Scene Config JSON"',
      'background:#10b981;color:#fff;padding:4px 8px;font-weight:bold;font-size:13px'
    );
    console.log(JSON.stringify(sceneConfig, null, 2));

    console.log(
      '%c[AvionEdit]  ANIMATION TIMING — update the four sliders in the Shopify section',
      'background:#f59e0b;color:#fff;padding:4px 8px;font-weight:bold;font-size:13px'
    );
    console.log(`  Anim 1 (airplane): start = ${P.anim0Start}%   end = ${P.anim0End}%`);
    console.log(`  Anim 2 (drop):     start = ${P.anim1Start}%   end = ${P.anim1End}%`);
  });

  console.info(
    '%c[AvionEdit] Editor ready! Adjust anything live, then click "Export Config" at the bottom of the panel.',
    'color:#10b981;font-weight:bold;font-size:12px'
  );

})();
