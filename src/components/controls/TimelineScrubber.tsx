import { useEffect, useRef, useState } from 'react';
import {
  TIMELINE_MAX_YEAR,
  TIMELINE_MIN_YEAR,
  TIMELINE_PLAY_RATE,
} from '../../utils/constants';
import { useUrlTimeline } from '../../hooks/useUrlState';

/**
 * Bottom-of-screen timeline. Two-thumb range slider over years; play button
 * advances the right edge at TIMELINE_PLAY_RATE years/sec, looping back to
 * t0 when it hits TIMELINE_MAX_YEAR. The hook persists t0/t1/play in the URL
 * so a deep link reproduces whatever moment a reader was looking at.
 */
export function TimelineScrubber() {
  const { t0, t1, play, setT0, setT1, setPlay } = useUrlTimeline();

  // Smooth play head separate from URL state — URL only updates when the
  // integer year flips, so dragging stays cheap and history doesn't churn.
  const [headYear, setHeadYear] = useState<number>(t1);
  const headRef = useRef(headYear);
  useEffect(() => {
    headRef.current = headYear;
  }, [headYear]);

  useEffect(() => {
    if (!play) {
      setHeadYear(t1);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      let next = headRef.current + TIMELINE_PLAY_RATE * dt;
      if (next > TIMELINE_MAX_YEAR) next = t0;
      headRef.current = next;
      setHeadYear(next);
      const intYear = Math.floor(next);
      if (intYear !== t1 && intYear >= t0) setT1(intYear);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // We intentionally exclude headYear/t1 — playback owns headRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play, t0]);

  const onLow = (next: number) => {
    const clamped = Math.min(next, t1);
    setT0(clamped);
  };
  const onHigh = (next: number) => {
    const clamped = Math.max(next, t0);
    setT1(clamped);
    if (!play) setHeadYear(clamped);
  };

  const span = TIMELINE_MAX_YEAR - TIMELINE_MIN_YEAR;
  const lowPct = ((t0 - TIMELINE_MIN_YEAR) / span) * 100;
  const highPct = ((t1 - TIMELINE_MIN_YEAR) / span) * 100;
  const headPct =
    ((Math.max(t0, Math.min(TIMELINE_MAX_YEAR, headYear)) - TIMELINE_MIN_YEAR) / span) * 100;

  return (
    <div className="pointer-events-auto rounded border border-phosphor-800/70 bg-black/75 px-4 py-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[10px] uppercase tracking-[0.22em] text-phosphor-700">
          Timeline
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setT0(TIMELINE_MIN_YEAR);
              setT1(TIMELINE_MAX_YEAR);
              setPlay(false);
              setHeadYear(TIMELINE_MAX_YEAR);
            }}
            className="rounded border border-phosphor-800/70 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-phosphor-600 hover:text-phosphor-300"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => setPlay(!play)}
            aria-pressed={play}
            className={
              'rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ' +
              (play
                ? 'border-phosphor-500 bg-phosphor-900/50 text-phosphor-200'
                : 'border-phosphor-800/70 text-phosphor-600 hover:text-phosphor-300')
            }
          >
            {play ? 'Pause' : 'Play'}
          </button>
          <span className="ml-1 font-mono text-xs tabular-nums text-phosphor-300">
            {t0} – {t1}
          </span>
        </div>
      </div>

      <div className="relative h-7">
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-phosphor-900" />
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-phosphor-500/70"
          style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
        />
        {play && (
          <div
            className="absolute top-1/2 h-3 w-[2px] -translate-y-1/2 bg-phosphor-300 shadow-[0_0_6px_rgb(127,255,172)]"
            style={{ left: `calc(${headPct}% - 1px)` }}
          />
        )}
        <input
          type="range"
          min={TIMELINE_MIN_YEAR}
          max={TIMELINE_MAX_YEAR}
          step={1}
          value={t0}
          onChange={(e) => onLow(Number(e.target.value))}
          aria-label="Timeline start year"
          className="timeline-range"
        />
        <input
          type="range"
          min={TIMELINE_MIN_YEAR}
          max={TIMELINE_MAX_YEAR}
          step={1}
          value={t1}
          onChange={(e) => onHigh(Number(e.target.value))}
          aria-label="Timeline end year"
          className="timeline-range"
        />
      </div>

      <div className="mt-1 flex justify-between text-[9px] tabular-nums text-phosphor-800">
        <span>{TIMELINE_MIN_YEAR}</span>
        <span>{Math.round((TIMELINE_MIN_YEAR + TIMELINE_MAX_YEAR) / 2)}</span>
        <span>{TIMELINE_MAX_YEAR}</span>
      </div>
    </div>
  );
}
