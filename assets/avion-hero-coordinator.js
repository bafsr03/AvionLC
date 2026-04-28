export function createAvionHeroCoordinator() {
  let sceneReady = false;
  let startTime = null;

  function maybeStart(nowSeconds) {
    if (!sceneReady || startTime !== null) {
      return;
    }

    startTime = nowSeconds;
  }

  return {
    markSceneReady(nowSeconds) {
      sceneReady = true;
      maybeStart(nowSeconds);
    },
    getAnimationElapsed(nowSeconds) {
      maybeStart(nowSeconds);

      if (!sceneReady || startTime === null) {
        return null;
      }

      return Math.max(nowSeconds - startTime, 0);
    },
    update() {}
  };
}
