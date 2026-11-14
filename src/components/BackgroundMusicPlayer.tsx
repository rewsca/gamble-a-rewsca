import React, { useEffect, useRef, useState } from 'react';
import { MUSIC_TRACKS, MusicTrackKey } from '../game/music';
import { sound } from '../game/sound';

interface YTPlayerInstance {
  playVideo?: () => void;
  pauseVideo?: () => void;
  mute?: () => void;
  unMute?: () => void;
  setVolume?: (volume: number) => void;
  loadVideoById?: (opts: { videoId: string; startSeconds?: number } | string) => void;
  getPlayerState?: () => number;
  destroy?: () => void;
}

interface YTNamespace {
  Player: new (
    elementId: string | HTMLElement,
    options: {
      height?: string | number;
      width?: string | number;
      videoId: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (event: { target: YTPlayerInstance }) => void;
        onStateChange?: (event: { data: number; target: YTPlayerInstance }) => void;
        onError?: (event: { data: number; target: YTPlayerInstance }) => void;
      };
    }
  ) => YTPlayerInstance;
  PlayerState?: {
    ENDED: number;
    PLAYING: number;
    PAUSED: number;
  };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
    __gambleBallYtApiPromise?: Promise<YTNamespace>;
  }
}

function loadYouTubeIframeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('No window'));
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT);
  }
  if (window.__gambleBallYtApiPromise) {
    return window.__gambleBallYtApiPromise;
  }

  window.__gambleBallYtApiPromise = new Promise<YTNamespace>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('YouTube IFrame API load timeout'));
    }, 6000);

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeoutId);
      if (typeof prevReady === 'function') {
        try {
          prevReady();
        } catch {
          // Ignore external handler failures
        }
      }
      if (window.YT && typeof window.YT.Player === 'function') {
        resolve(window.YT);
      } else {
        reject(new Error('YT.Player unavailable'));
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="youtube.com/iframe_api"]'
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        reject(new Error('YouTube IFrame API script failed to load'));
      };
      document.head.appendChild(script);
    }
  });

  return window.__gambleBallYtApiPromise;
}

export interface BackgroundMusicPlayerProps {
  track: MusicTrackKey;
  volume: number;
  paused?: boolean;
}

export const BackgroundMusicPlayer: React.FC<BackgroundMusicPlayerProps> = ({
  track,
  volume,
  paused = false,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayerInstance | null>(null);
  const playerReadyRef = useRef(false);
  const loadedTrackRef = useRef<MusicTrackKey | null>(null);
  const userInteractedRef = useRef(false);
  const apiBlockedRef = useRef(false);
  const failedTracksRef = useRef<Set<MusicTrackKey>>(new Set());

  const trackRef = useRef<MusicTrackKey>(track);
  const volumeRef = useRef<number>(volume);
  const pausedRef = useRef<boolean>(paused);
  const [mode, setMode] = useState<'youtube' | 'fallback'>('youtube');

  trackRef.current = track;
  volumeRef.current = volume;
  pausedRef.current = paused;

  const syncPlayback = useRef<() => void>(() => {});
  syncPlayback.current = () => {
    const curTrack = trackRef.current;
    const curVolume = volumeRef.current;
    const isPaused = pausedRef.current;
    const shouldPlay = curVolume > 0 && !isPaused;
    const useFallback = apiBlockedRef.current || failedTracksRef.current.has(curTrack);

    sound.setMusicVolume(curVolume);

    if (useFallback) {
      setMode('fallback');
      try {
        playerRef.current?.mute?.();
        playerRef.current?.pauseVideo?.();
      } catch {
        // Ignore player cleanup issues
      }
      if (shouldPlay && userInteractedRef.current) {
        sound.startFallbackBgm(curTrack);
      } else {
        sound.stopFallbackBgm();
      }
      return;
    }

    setMode('youtube');
    sound.stopFallbackBgm();

    const player = playerRef.current;
    if (!player || !playerReadyRef.current) return;

    const targetVideoId = MUSIC_TRACKS[curTrack].videoId;
    if (loadedTrackRef.current !== curTrack) {
      loadedTrackRef.current = curTrack;
      try {
        player.loadVideoById?.({ videoId: targetVideoId, startSeconds: 0 });
      } catch {
        // Ignore transient YouTube API load error
      }
    }

    const ytVolume = Math.max(0, Math.min(100, Math.round(curVolume * 100)));
    try {
      player.setVolume?.(ytVolume);
      if (shouldPlay) {
        player.unMute?.();
        if (userInteractedRef.current) {
          player.playVideo?.();
        }
      } else {
        player.mute?.();
        player.pauseVideo?.();
      }
    } catch {
      // Ignore YouTube iframe postMessage timing errors
    }
  };

  useEffect(() => {
    let disposed = false;

    const onFirstGesture = () => {
      userInteractedRef.current = true;
      syncPlayback.current();
    };
    window.addEventListener('pointerdown', onFirstGesture, { passive: true });
    window.addEventListener('keydown', onFirstGesture, { passive: true });

    loadYouTubeIframeApi()
      .then((YT) => {
        if (disposed || !hostRef.current) return;
        const mountEl = document.createElement('div');
        hostRef.current.innerHTML = '';
        hostRef.current.appendChild(mountEl);

        const initialTrack = trackRef.current;
        loadedTrackRef.current = initialTrack;

        playerRef.current = new YT.Player(mountEl, {
          width: 200,
          height: 200,
          videoId: MUSIC_TRACKS[initialTrack].videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            loop: 1,
            playlist: MUSIC_TRACKS[initialTrack].videoId,
            origin: window.location.origin,
          },
          events: {
            onReady: (ev) => {
              if (disposed) return;
              playerRef.current = ev.target;
              playerReadyRef.current = true;
              syncPlayback.current();
            },
            onStateChange: (ev) => {
              if (disposed) return;
              const endedState = YT.PlayerState?.ENDED ?? 0;
              if (ev.data === endedState && volumeRef.current > 0 && !pausedRef.current) {
                try {
                  ev.target.playVideo?.();
                } catch {
                  // Ignore loop restart error
                }
              }
            },
            onError: () => {
              if (disposed) return;
              failedTracksRef.current.add(trackRef.current);
              syncPlayback.current();
            },
          },
        });
      })
      .catch(() => {
        if (disposed) return;
        apiBlockedRef.current = true;
        syncPlayback.current();
      });

    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      sound.stopFallbackBgm();
      playerReadyRef.current = false;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // Ignore teardown error
      }
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    syncPlayback.current();
  }, [track, volume, paused]);

  return (
    <div
      ref={hostRef}
      data-testid="bgm-player"
      data-track={track}
      data-mode={mode}
      aria-hidden="true"
      className="fixed -left-16 -top-16 w-px h-px overflow-hidden opacity-0 pointer-events-none"
    />
  );
};
