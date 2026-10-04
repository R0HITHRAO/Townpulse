/**
 * TownPulse Business Hours
 * =========================
 * Decides whether a listing is open *now* from the free-text hours people
 * actually type: "9am-5pm", "Mo-Su 08:00-22:00", "10:00-12:00, 16:00-19:00".
 *
 * Three rules, each fixing a defect recorded in AUDIT.md (4.4, 4.5):
 *
 *  1. Missing or unparseable hours resolve to a distinct `unknown` state,
 *     never to "open". Absent data must not be presented as "Open Now" — the
 *     reader may be deciding whether to walk somewhere right now.
 *  2. Ranges are matched with a time-range pattern instead of splitting on
 *     /[-–—to]/i. That character class also matches the letters "t" and "o",
 *     so "Mo-Su 08:00-22:00" — and any text containing "to" — was silently
 *     mangled into a confident wrong answer.
 *  3. Multi-range days ("10:00-12:00, 16:00-19:00") are supported, because
 *     lunch closures are written that way in the directory data.
 *
 * The *policy* deliberately mirrors `backend/app/services/hours_service.py`:
 * unreadable input is "unknown" on both sides, and a missing day row with
 * other rows present is "closed" on both sides. The implementations differ;
 * the meaning of each state must not.
 */

export type OpenState = 'open' | 'closed' | 'unknown';

export interface OpenStatus {
  state: OpenState;
  /**
   * Convenience for filters. `null` when unknown — callers must treat it as
   * "not open" and must never coerce it to `true`.
   */
  isOpen: boolean | null;
  statusText: string;
  is24Hours?: boolean;
}

/** "24/7", "24 hours", "24hrs", "24x7", "24 h". */
const ALWAYS_OPEN_RE = /\b(?:24\s*\/\s*7|24\s*[x×*]\s*7|24\s*(?:hours|hrs|hr|h))\b/i;

/**
 * One time range, found anywhere inside a segment, so day prefixes like
 * "Mo-Su" are ignored rather than mangled. Captures: open, its am/pm suffix,
 * close, its am/pm suffix.
 */
const RANGE_RE =
  /(\d{1,2}(?::\d{2})?)\s*(am|pm)?\s*(?:-|–|—|to|till|until|\/)\s*(\d{1,2}(?::\d{2})?)\s*(am|pm)?/i;

/** A whole segment that simply says the place is shut, e.g. "Closed". */
const CLOSED_ROW_RE = /^(?:closed|close|shut|holiday|off|none|n\/a|na)$/i;

/** Weekday tokens that can prefix a segment ("Mo-Su 08:00-22:00"). */
const DAY_PREFIX_RE =
  /^(?:(?:mo|tu|we|th|fr|sa|su|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)[\s,&/-]*)+/i;

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** "9", "09:30", "9 AM", "6pm" → minutes past midnight, or null. */
function parseClock(raw: string, suffix?: string): number | null {
  const [hourText, minuteText] = raw.split(':');
  const hour = Number(hourText);
  const minute = minuteText === undefined ? 0 : Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;

  const marker = suffix?.toLowerCase();
  if (marker === 'pm') {
    if (hour > 12) return null;
    return (hour === 12 ? 12 : hour + 12) * 60 + minute;
  }
  if (marker === 'am') {
    if (hour > 12) return null;
    return (hour === 12 ? 0 : hour) * 60 + minute;
  }
  // 24-hour clock; a bare "14" without a suffix is unambiguous enough here.
  if (hour > 23) return null;
  return hour * 60 + minute;
}

interface Range {
  /** Minutes past midnight; `close` may exceed 1440 when it crosses midnight. */
  open: number;
  close: number;
  openText: string;
  closeText: string;
}

/** Parse one comma-separated segment into a range, or null when unreadable. */
function parseRange(segment: string): Range | null {
  const match = segment.match(RANGE_RE);
  if (!match) return null;

  const [, rawOpen, suffixOpen, rawClose, suffixClose] = match;
  const open = parseClock(rawOpen, suffixOpen);
  const close = parseClock(rawClose, suffixClose);
  if (open === null || close === null) return null;

  const bareHours =
    !rawOpen.includes(':') && !rawClose.includes(':') && !suffixOpen && !suffixClose;

  let closeMinutes = close;
  if (close <= open) {
    if (bareHours && open <= 12 * 60 && close <= 12 * 60) {
      // "9-5" reads as a daytime shift, not a night shift ending at 5am.
      closeMinutes = close + 12 * 60;
    } else {
      // A real overnight shift ("8pm-6am"): push close past midnight.
      closeMinutes = close + 24 * 60;
    }
  }

  return {
    open,
    close: closeMinutes,
    openText: `${rawOpen}${suffixOpen ? ` ${suffixOpen.toUpperCase()}` : ''}`,
    closeText: `${rawClose}${suffixClose ? ` ${suffixClose.toUpperCase()}` : ''}`,
  };
}

/** Is `minutes` (0..1439) inside this range? Handles past-midnight closes. */
function isWithin(range: Range, minutes: number): boolean {
  if (range.close <= 24 * 60) {
    return minutes >= range.open && minutes < range.close;
  }
  // Overnight: open until midnight, then until (close - 24h) next morning.
  return minutes >= range.open || minutes < range.close - 24 * 60;
}

/** Read one hours string into a status; null when it cannot be read at all. */
function evaluate(raw: string, minutes: number): OpenStatus | null {
  const text = raw.trim();
  if (!text) return null;

  if (ALWAYS_OPEN_RE.test(text)) {
    return { state: 'open', isOpen: true, statusText: 'Open 24/7', is24Hours: true };
  }

  const segments = text
    .split(/\s*[;,]\s*|\s+and\s+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  const ranges: Range[] = [];
  let sawClosedRow = false;

  for (const segment of segments) {
    const range = parseRange(segment);
    if (range) {
      ranges.push(range);
      continue;
    }
    const withoutDays = segment.replace(DAY_PREFIX_RE, '').trim();
    if (withoutDays && CLOSED_ROW_RE.test(withoutDays)) {
      sawClosedRow = true;
    }
  }

  if (ranges.length > 0) {
    const hit = ranges.find((range) => isWithin(range, minutes));
    if (hit) {
      return { state: 'open', isOpen: true, statusText: `Open until ${hit.closeText}` };
    }
    return {
      state: 'closed',
      isOpen: false,
      statusText: `Closed • Opens at ${ranges[0].openText}`,
    };
  }

  if (sawClosedRow) {
    return { state: 'closed', isOpen: false, statusText: 'Closed Today' };
  }

  return null;
}

/**
 * Calculates whether a business is currently open from its hours dictionary.
 *
 * Accepts an optional `now` for deterministic tests — the same escape hatch
 * the backend's `is_open_now(at=...)` provides, so both sides can be tested at
 * a fixed instant.
 */
export function getOpenStatus(
  hours?: Record<string, string> | null,
  now: Date = new Date()
): OpenStatus {
  const rows = hours
    ? Object.entries(hours).filter(([, value]) => typeof value === 'string' && value.trim())
    : [];

  if (rows.length === 0) {
    return { state: 'unknown', isOpen: null, statusText: 'Hours not specified' };
  }

  const lookup = new Map(rows.map(([key, value]) => [key.toLowerCase(), value]));
  const today = now.getDay();
  const todayKey = DAY_KEYS[today];
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isWeekend = today === 0 || today === 6;

  // Today's row wins; then the general rows in the order people write them.
  // "weekends" only applies at the weekend, "weekdays" only Monday-Friday.
  const generalKeys = isWeekend
    ? ['all_days', 'all', 'daily', 'everyday', 'every_day', 'weekends', 'mon_sun', 'monday_sunday']
    : ['all_days', 'all', 'daily', 'everyday', 'every_day', 'weekdays', 'monday_friday', 'mon_fri'];

  const candidates = [lookup.get(todayKey), ...generalKeys.map((key) => lookup.get(key))].filter(
    (value): value is string => Boolean(value)
  );

  for (const raw of candidates) {
    const status = evaluate(raw, minutes);
    if (status) return status;
  }

  // Nothing usable for today. Mirror the backend: a calendar that has other
  // days filled in means today is closed there; a calendar that cannot be
  // read at all stays unknown rather than guessing either way.
  const anyReadable = rows.some(([, value]) => evaluate(value, minutes) !== null);
  if (anyReadable) {
    return { state: 'closed', isOpen: false, statusText: 'Closed Today' };
  }

  return { state: 'unknown', isOpen: null, statusText: candidates[0] ?? rows[0][1] };
}
