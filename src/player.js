import { useEffect, useMemo, useRef, useState, useCallback } from '@wordpress/element';
import { motion, useMotionValue, animate } from 'framer-motion';
import { Play } from 'lucide-react';
import './style.scss';

export const defaults = {
  stationName: 'CFUR Radio',
  city: 'Prince George',
  frequency: 88.7,
  bandKind: 'fm',
  bandMin: 70,
  bandMax: 108,
  bandStep: 0.2,
  bandMajor: 1,
  bandDecimals: 1,
  streamUrl: 'https://cfur-radio-proxy.ote-publisher.workers.dev',
  track: 'One More Cup of Coffee',
  artist: 'Bob Dylan',
  defaultLocked: true,
};

const PX_PER_MAJOR = 40;
const MINOR_SPACING = 8;
const EDGE_PADDING = 14;
const LED_FONT_STACK = '"LEDCounter7", var(--ote-font-mono)';
const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);
const rounded = (value, decimals) => {
  const power = Math.pow(10, decimals);
  return Math.round(value * power) / power;
};

const PulsingDot = () => (
  <span className="ote-radio__pulse-dot" aria-hidden="true">
    <span className="ote-radio__pulse-dot-glow" />
    <span className="ote-radio__pulse-dot-core" />
  </span>
);

const TunerRuler = ({ band, displayFrequency, frequency, isLocked, onScrub }) => {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      setWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    setWidth(containerRef.current.clientWidth);
    return () => observer.disconnect();
  }, []);

  const pxUnit = pxPerUnit(band);
  const bandWidthPx = (band.max - band.min) * pxUnit;
  const contentWidth = bandWidthPx + EDGE_PADDING * 2;
  const tapeWidth = Math.max(contentWidth, width || 1);
  const translateX = useMemo(() => {
    if (!width) return 0;
    const unitsFromMin = displayFrequency - band.min;
    const currentPx = unitsFromMin * pxUnit + EDGE_PADDING;
    const centerPx = width / 2;
    const raw = centerPx - currentPx;
    const rightBound = centerPx - tapeWidth;
    return Math.max(raw, rightBound);
  }, [band.min, pxUnit, displayFrequency, tapeWidth, width]);

  const minorTicks = useMemo(() => Math.ceil(bandWidthPx / MINOR_SPACING) + 1, [bandWidthPx]);
  const majorTicks = useMemo(() => Math.ceil(bandWidthPx / PX_PER_MAJOR) + 1, [bandWidthPx]);
  const labelValues = useMemo(() => fullMajorMarkers(band), [band]);

  const handleChange = (event) => {
    const next = Number(event.target.value);
    onScrub(next);
  };

  return (
    <div ref={containerRef} className="ote-radio__ruler">
      <motion.div
        className="ote-radio__tape"
        style={{ width: tapeWidth }}
        animate={{ x: translateX }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg width={tapeWidth} height={112} viewBox={`0 0 ${tapeWidth} 112`} aria-hidden="true">
          {[...Array(minorTicks)].map((_, index) => {
            const x = EDGE_PADDING + index * MINOR_SPACING;
            return (
              <line
                key={`minor-${index}`}
                x1={x}
                x2={x}
                y1={26}
                y2={70}
                stroke="var(--ote-tick-minor)"
                strokeWidth={1}
              />
            );
          })}

          {[...Array(majorTicks)].map((_, index) => {
            const x = EDGE_PADDING + index * PX_PER_MAJOR;
            return (
              <line
                key={`major-${index}`}
                x1={x}
                x2={x}
                y1={12}
                y2={82}
                stroke="var(--ote-tick-major)"
                strokeWidth={2}
              />
            );
          })}

          {labelValues.map((value) => {
            const offset = EDGE_PADDING + (value - band.min) * pxUnit;
            return (
              <text
                key={`label-${value}`}
                x={offset}
                y={100}
                textAnchor="middle"
                fill="var(--ote-muted-2)"
                fontSize={11}
                fontWeight={600}
              >
                {value.toFixed(0)}
              </text>
            );
          })}
        </svg>
      </motion.div>

      <div className="ote-radio__indicator" />

      <input
        type="range"
        className="ote-radio__tuner-input"
        value={frequency}
        min={band.min}
        max={band.max}
        step={band.step}
        onChange={handleChange}
        disabled={isLocked}
        aria-label="Tune frequency"
      />
    </div>
  );
};

export const RadioPlayer = ({
  stationName = defaults.stationName,
  city = defaults.city,
  frequency = defaults.frequency,
  bandKind = defaults.bandKind,
  bandMin = defaults.bandMin,
  bandMax = defaults.bandMax,
  bandStep = defaults.bandStep,
  bandMajor = defaults.bandMajor,
  bandDecimals = defaults.bandDecimals,
  streamUrl = defaults.streamUrl,
  track = defaults.track,
  artist = defaults.artist,
  defaultLocked = defaults.defaultLocked,
  playbackDisabled = false,
  onFrequencyChange,
}) => {
  const [status, setStatus] = useState('idle');
  const locked = true;
  const [tunedFrequency, setTunedFrequency] = useState(() => clampNumber(Number(frequency), Number(bandMin), Number(bandMax)));
  const [hasCompletedIntro, setHasCompletedIntro] = useState(false);
  const frequencyMotion = useMotionValue(Number(bandMin));
  const [displayFrequency, setDisplayFrequency] = useState(Number(bandMin));
  const audioRef = useRef(null);
  const bufferRef = useRef(null);
  const animationRef = useRef(null);
  const introTimeoutRef = useRef(null);
  const setPlayingIfActive = useCallback(() => {
    setStatus((prev) => (prev === 'idle' ? prev : 'playing'));
  }, []);

  // Subscribe to motion value changes
  useEffect(() => {
    const unsubscribe = frequencyMotion.on('change', (value) => setDisplayFrequency(value));
    return () => unsubscribe();
  }, [frequencyMotion]);

  useEffect(() => {
    setTunedFrequency((current) => clampNumber(current, Number(bandMin), Number(bandMax)));
  }, [bandMin, bandMax]);

  useEffect(() => {
    setTunedFrequency(clampNumber(Number(frequency), Number(bandMin), Number(bandMax)));
  }, [frequency]);

  const isActivelyPlaying = status === 'playing' || status === 'buffering';
  const showsLiveState = status === 'playing';

  const animateToFrequency = useCallback((value, duration = 0.35) => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    animationRef.current = animate(frequencyMotion, value, {
      duration,
      ease: 'easeOut',
    });
  }, [frequencyMotion]);

  // Cleanup animations
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      if (introTimeoutRef.current) {
        clearTimeout(introTimeoutRef.current);
      }
      if (bufferRef.current) {
        clearTimeout(bufferRef.current);
      }
    };
  }, []);

  // Intro animation when playing starts
  useEffect(() => {
    const isActivelyPlaying = status === 'playing' || status === 'buffering';

    if (!isActivelyPlaying) {
      if (!hasCompletedIntro) {
        if (animationRef.current) {
          animationRef.current.stop();
        }
        frequencyMotion.set(Number(bandMin));
      }
      return;
    }

    if (!hasCompletedIntro) {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      if (introTimeoutRef.current) {
        clearTimeout(introTimeoutRef.current);
      }
      frequencyMotion.set(Number(bandMin));
      animationRef.current = animate(frequencyMotion, tunedFrequency, {
        duration: 1.2,
        ease: 'easeOut',
        onComplete: () => {
          setHasCompletedIntro(true);
        },
      });
      return;
    }

    animateToFrequency(tunedFrequency, 0.4);
  }, [status, hasCompletedIntro, tunedFrequency, bandMin, animateToFrequency, frequencyMotion]);

  // Animate frequency changes after intro
  useEffect(() => {
    if (!hasCompletedIntro) {
      return;
    }
    animateToFrequency(tunedFrequency, 0.25);
  }, [tunedFrequency, hasCompletedIntro, animateToFrequency]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = 0.85;
    audioRef.current = audio;

    const handleCanPlay = () => setPlayingIfActive();
    const handlePlaying = () => setPlayingIfActive();
    const handleTimeUpdate = () => {
      if (audio.currentTime > 0) {
        setPlayingIfActive();
      }
    };
    const handleWaiting = () => setStatus((prev) => (prev === 'idle' ? 'idle' : 'buffering'));
    const handleError = () => setStatus('error');

    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('stalled', handleWaiting);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('stalled', handleWaiting);
      audio.removeEventListener('error', handleError);
    };
  }, [setPlayingIfActive]);

  const startPlayback = () => {
    if (playbackDisabled) {
      setStatus('idle');
      return;
    }

    const audio = audioRef.current || new Audio();
    audioRef.current = audio;
    audio.crossOrigin = 'anonymous';
    audio.volume = 0.85;
    audio.src = streamUrl;
    setStatus('buffering');

    if (bufferRef.current) {
      clearTimeout(bufferRef.current);
    }

    const playPromise = audio.play();
    const ensurePlaybackStarted = () => {
      const currentAudio = audioRef.current;
      if (!currentAudio || currentAudio.paused) {
        bufferRef.current = null;
        return;
      }
      if (currentAudio.currentTime > 0 || currentAudio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setPlayingIfActive();
        bufferRef.current = null;
        return;
      }
      bufferRef.current = setTimeout(ensurePlaybackStarted, 80);
    };

    ensurePlaybackStarted();

    if (playPromise?.catch) {
      playPromise
        .then(() => {
          setPlayingIfActive();
          ensurePlaybackStarted();
        })
        .catch(() => setStatus('error'));
    }
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (bufferRef.current) {
      clearTimeout(bufferRef.current);
    }
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }
    setStatus('idle');
    if (!hasCompletedIntro) {
      if (animationRef.current) {
        animationRef.current.stop();
      }
      frequencyMotion.set(Number(bandMin));
    }
  };

  const togglePlayback = () => {
    if (status === 'playing' || status === 'buffering') {
      stopPlayback();
      return;
    }
    startPlayback();
  };

  const tuneBy = (delta) => {
    setTunedFrequency((value) => {
      const next = rounded(clampNumber(Number(value) + Number(delta), Number(bandMin), Number(bandMax)), Number(bandDecimals));
      onFrequencyChange?.(next);
      return next;
    });
  };

  const handleScrub = (value) => {
    const next = rounded(clampNumber(Number(value), Number(bandMin), Number(bandMax)), Number(bandDecimals));
    setTunedFrequency(next);
    onFrequencyChange?.(next);
  };

  const bandLabel = bandKind?.toUpperCase?.() || 'FM';
  const statusLabel = showsLiveState ? 'Live' : status === 'buffering' ? 'Connecting' : 'Off Air';

  return (
    <div className="ote-radio">
      <div className="ote-radio__card">
        <div className="ote-radio__top">
          <div className="ote-radio__summary">
            <p className="ote-radio__meta">
              {city} • {bandLabel}
            </p>
            <h2 className="ote-radio__title">{stationName}</h2>
          </div>

          <div className="ote-radio__status-block">
            <button
              type="button"
              className={`ote-radio__status-toggle ${showsLiveState ? 'is-live' : ''}`}
              onClick={togglePlayback}
            >
              <span className={`ote-radio__status-dot ${showsLiveState ? 'is-live' : ''}`} />
              {statusLabel}
            </button>
          </div>
        </div>

        <TunerRuler
          band={{ min: Number(bandMin), max: Number(bandMax), step: Number(bandStep), major: Number(bandMajor), decimals: Number(bandDecimals) }}
          displayFrequency={displayFrequency}
          frequency={tunedFrequency}
          isLocked={locked}
          onScrub={handleScrub}
        />

        <div className="ote-radio__footer">
          <div className="ote-radio__frequency">
            <div className="ote-radio__frequency-value" style={{ fontFamily: LED_FONT_STACK }}>
              {displayFrequency.toFixed(Number(bandDecimals))}
            </div>
            <div className="ote-radio__frequency-label">Tuned • {bandLabel}</div>
          </div>

          <div className="ote-radio__actions">
            <button
              type="button"
              className={`ote-radio__primary-btn is-locked${showsLiveState ? ' is-live' : ''}`}
              onClick={togglePlayback}
            >
              {showsLiveState ? <PulsingDot /> : <Play size={20} />}
              {showsLiveState ? 'Live' : status === 'buffering' ? 'Connecting' : status === 'error' ? 'Retry' : 'Go Live'}
            </button>
          </div>
        </div>

        {playbackDisabled && <p className="ote-radio__frequency-label">Audio playback is disabled while editing.</p>}
      </div>
    </div>
  );
};

function pxPerUnit(band) {
  return PX_PER_MAJOR / band.major;
}

function fullMajorMarkers(band) {
  const labels = [];
  let value = band.min;
  while (value <= band.max + 0.0001) {
    labels.push(Number(value.toFixed(2)));
    value += band.major;
  }
  return labels;
}
