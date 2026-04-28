import { createAvionHeroCoordinator } from './avion-hero-coordinator.js';

window.__AvionHeroCoordinator = createAvionHeroCoordinator(window.AvionHero || {});

await import('./avion-hero-runtime.js');
