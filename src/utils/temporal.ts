import { TIMELINE_MAX_YEAR, TIMELINE_MIN_YEAR } from './constants';

/** A year that effectively means "always visible" — used for features
 *  missing a temporal field so they stay on regardless of the scrubber. */
export const ALWAYS_YEAR = TIMELINE_MIN_YEAR;

export interface TimeWindow {
  t0: number;
  t1: number;
}

/** Whether the scrubber is filtering anything (i.e. not the full range). */
export function isFiltered(win: TimeWindow): boolean {
  return win.t0 > TIMELINE_MIN_YEAR || win.t1 < TIMELINE_MAX_YEAR;
}
