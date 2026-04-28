const UNLOCK_EVENTS = ['pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];
const AUDIO_MAX_VOLUME = 0.5;
const AUDIO_FADE_IN_PORTION = 0.08;
const AUDIO_FADE_OUT_START = 0.74;

function getLocalProgress(xs, timing) {
  const windowRange = timing?.[0];
  const start = windowRange?.start ?? 0;
  const end = windowRange?.end ?? 1;
  const span = Math.max(end - start, 0.001);

  if (xs <= start) {
    return 0;
  }

  if (xs >= end) {
    return 1;
  }

  return (xs - start) / span;
}

function createAudioController(soundUrl) {
  if (!soundUrl || !soundUrl.trim()) {
    return null;
  }

  const audio = new Audio(soundUrl.replace('http:', 'https:'));
  audio.preload = 'auto';
  audio.loop = false;
  audio.volume = 0;
  audio.load();

  let primed = false;
  let playRequested = false;
  let lastVolume = -1;

  function prime() {
    if (primed) {
      return;
    }

    audio.muted = true;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
      primed = true;
    }).catch(() => {
      audio.muted = false;
    });
  }

  function setPlaying(shouldPlay) {
    if (shouldPlay) {
      if (audio.paused || !playRequested) {
        playRequested = true;
        audio.play().catch(() => {});
      }
      return;
    }

    if (!audio.paused) {
      audio.pause();
    }
    playRequested = false;
  }

  function syncTime(localProgress) {
    if (!isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const safeDuration = Math.max(audio.duration - 0.05, 0);
    const targetTime = Math.min(localProgress * safeDuration, safeDuration);

    if (audio.paused) {
      if (Math.abs(audio.currentTime - targetTime) > 0.05) {
        try {
          audio.currentTime = targetTime;
        } catch (error) {
          // Ignore seek races while metadata settles.
        }
      }
    }
  }

  function setVolume(localProgress, isActive) {
    let volume = 0;

    if (isActive) {
      if (localProgress < AUDIO_FADE_IN_PORTION) {
        volume = localProgress / AUDIO_FADE_IN_PORTION;
      } else if (localProgress < AUDIO_FADE_OUT_START) {
        volume = 1;
      } else {
        const fadeProgress = (localProgress - AUDIO_FADE_OUT_START) / (1 - AUDIO_FADE_OUT_START);
        volume = Math.pow(Math.max(0, 1 - fadeProgress), 2.2);
      }
    }

    volume = Math.max(0, Math.min(1, volume)) * AUDIO_MAX_VOLUME;

    if (Math.abs(volume - lastVolume) > 0.01) {
      audio.volume = volume;
      lastVolume = volume;
    }
  }

  return {
    prime,
    update(xs, timing, animationStarted) {
      const localProgress = getLocalProgress(xs, timing);
      const isActive = animationStarted && localProgress > 0 && localProgress < 1;

      syncTime(localProgress);
      setPlaying(isActive);
      setVolume(localProgress, isActive);

      if (!isActive && localProgress === 0 && !audio.paused) {
        audio.pause();
        playRequested = false;
      }
    }
  };
}

export function createAvionHeroCoordinator(config = {}) {
  const audio = createAudioController(config.soundUrl || '');
  const requiresInteraction = Boolean(audio);

  let sceneReady = false;
  let startTime = null;
  let interactionSeen = !requiresInteraction;

  function maybeStart(nowSeconds) {
    if (!sceneReady || startTime !== null || !interactionSeen) {
      return;
    }

    startTime = nowSeconds;
  }

  function handleUnlock() {
    interactionSeen = true;

    if (audio) {
      audio.prime();
    }

    UNLOCK_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, handleUnlock);
    });
  }

  if (requiresInteraction) {
    UNLOCK_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUnlock, { passive: true });
    });
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
    update({ nowSeconds, xs, timing }) {
      maybeStart(nowSeconds);

      if (audio) {
        audio.update(xs, timing, startTime !== null);
      }
    }
  };
}
