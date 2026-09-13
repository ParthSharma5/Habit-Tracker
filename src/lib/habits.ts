import { differenceInCalendarDays, format, parseISO, subDays } from "date-fns";

/**
 * A single day's entry. `done` and `minutes` are independent: a habit can be
 * ticked off with no time logged, and time can sit on a day that is not ticked.
 * Keeping them apart is what lets you untick a day without losing the minutes.
 */
export type Completion = {
  /** yyyy-MM-dd. Stored as a string so JSON round-trips cleanly. */
  date: string;
  done: boolean;
  minutes?: number;
};

/** An entry only earns its place while it carries something. */
export function isEmptyCompletion(completion: Completion) {
  return !completion.done && !completion.minutes;
}

export type Habit = {
  id: string;
  name: string;
  /** Optional per-habit daily target, in minutes. */
  goalMinutes?: number;
  /**
   * ISO timestamp of a running timer, or undefined when it is not running.
   * Elapsed time is always derived from this against the current clock, never
   * accumulated by ticking, so the timer survives a refresh, a closed tab, and
   * a sleeping machine.
   */
  runningSince?: string;
  completions: Completion[];
};

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function fromDateKey(key: string) {
  return parseISO(key);
}

export function getCompletion(habit: Habit, date: Date) {
  const key = toDateKey(date);
  return habit.completions.find((c) => c.date === key);
}

export function isCompletedOn(habit: Habit, date: Date) {
  return getCompletion(habit, date)?.done ?? false;
}

/** How far a day got toward the goal, 0..1. Null when the habit has no goal. */
export function getGoalProgress(habit: Habit, date: Date) {
  if (!habit.goalMinutes) return null;
  return Math.min(1, getMinutesOn(habit, date) / habit.goalMinutes);
}

export function hasMetGoal(habit: Habit, date: Date) {
  return habit.goalMinutes !== undefined && getMinutesOn(habit, date) >= habit.goalMinutes;
}

/** How many of the given days reached the goal. */
export function countGoalDays(habit: Habit, dates: Date[]) {
  if (!habit.goalMinutes) return 0;
  return dates.filter((date) => hasMetGoal(habit, date)).length;
}

/** True when a day has time on it but has not been ticked off. */
export function hasUntickedTime(habit: Habit, date: Date) {
  const completion = getCompletion(habit, date);
  return completion !== undefined && !completion.done && !!completion.minutes;
}

export function getMinutesOn(habit: Habit, date: Date) {
  return getCompletion(habit, date)?.minutes ?? 0;
}

/**
 * A habit is "done" for a day if there is an entry at all — the streak never
 * depends on minutes, even when the habit has a goal.
 */
export function getStreak(completions: Completion[]) {
  const keys = new Set(completions.filter((c) => c.done).map((c) => c.date));

  let streak = 0;
  let date = new Date();

  while (keys.has(toDateKey(date))) {
    streak++;
    date = subDays(date, 1);
  }

  return streak;
}

/**
 * Longest run of consecutive completed days ever recorded.
 *
 * `getStreak` only counts backwards from today, so a 40-day run that ended
 * yesterday reads as zero — this keeps that work visible.
 */
export function getBestStreak(completions: Completion[]) {
  const days = completions
    .filter((c) => c.done)
    .map((c) => fromDateKey(c.date).getTime())
    .sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let previous: number | null = null;

  for (const day of days) {
    run = previous !== null && isNextCalendarDay(previous, day) ? run + 1 : 1;
    previous = day;
    best = Math.max(best, run);
  }

  return best;
}

function isNextCalendarDay(previous: number, current: number) {
  const next = new Date(previous);
  next.setDate(next.getDate() + 1);

  return toDateKey(next) === toDateKey(new Date(current));
}

export function getTotalMinutes(habit: Habit) {
  return habit.completions.reduce((total, c) => total + (c.minutes ?? 0), 0);
}

export function getDoneCount(habit: Habit) {
  return habit.completions.filter((c) => c.done).length;
}

/** The earliest day this habit has any record for, or null when it is new. */
export function getFirstTrackedDate(habit: Habit) {
  const first = habit.completions
    .map((c) => c.date)
    .sort((a, b) => a.localeCompare(b))
    .at(0);

  return first ? fromDateKey(first) : null;
}

/**
 * Share of days completed since tracking began. Measured from the first
 * recorded day rather than from the habit's creation, which is not stored.
 */
export function getCompletionRate(habit: Habit, today = new Date()) {
  const first = getFirstTrackedDate(habit);
  if (!first) return null;

  const days = differenceInCalendarDays(today, first) + 1;
  if (days <= 0) return null;

  return Math.min(1, getDoneCount(habit) / days);
}

/**
 * Relative intensity of a day, 0..1, for the history heatmap. Uses the goal as
 * the ceiling when there is one, otherwise the habit's own busiest day, so the
 * scale always means something.
 */
export function getDayIntensity(habit: Habit, date: Date, busiestMinutes: number) {
  const completion = getCompletion(habit, date);
  if (!completion) return 0;

  const minutes = completion.minutes ?? 0;
  if (minutes === 0) return completion.done ? 0.25 : 0;

  const ceiling = habit.goalMinutes || busiestMinutes || minutes;
  return Math.max(0.25, Math.min(1, minutes / ceiling));
}

export function getBusiestMinutes(habit: Habit) {
  return habit.completions.reduce((most, c) => Math.max(most, c.minutes ?? 0), 0);
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

/**
 * Upgrades data written by earlier versions, where a habit's completions were a
 * bare `Date[]` (serialized by JSON into ISO strings). Anything unrecognisable
 * is dropped rather than crashing the app on load.
 */
export function migrateHabits(raw: unknown): Habit[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((habit): Habit[] => {
    if (typeof habit !== "object" || habit === null) return [];

    const { id, name, goalMinutes, runningSince, completions } =
      habit as Record<string, unknown>;
    if (typeof id !== "string" || typeof name !== "string") return [];

    return [
      {
        id,
        name,
        goalMinutes: typeof goalMinutes === "number" ? goalMinutes : undefined,
        runningSince: migrateRunningSince(runningSince),
        completions: migrateCompletions(completions),
      },
    ];
  });
}

function migrateCompletions(raw: unknown): Completion[] {
  if (!Array.isArray(raw)) return [];

  const byDate = new Map<string, Completion>();

  for (const entry of raw) {
    const completion = migrateCompletion(entry);
    if (!completion) continue;

    // Old data could hold several timestamps on the same day; keep one entry per
    // day and sum whatever time they carried.
    const existing = byDate.get(completion.date);
    byDate.set(
      completion.date,
      existing
        ? {
            date: completion.date,
            done: existing.done || completion.done,
            minutes: sumMinutes(existing.minutes, completion.minutes),
          }
        : completion,
    );
  }

  return [...byDate.values()]
    .filter((c) => !isEmptyCompletion(c))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function migrateCompletion(entry: unknown): Completion | null {
  // Old shape: a Date, or the ISO string JSON turned it into.
  if (typeof entry === "string" || entry instanceof Date) {
    const date = typeof entry === "string" ? new Date(entry) : entry;
    return Number.isNaN(date.getTime()) ? null : { date: toDateKey(date), done: true };
  }

  if (typeof entry !== "object" || entry === null) return null;

  const { date, done, minutes } = entry as Record<string, unknown>;
  if (typeof date !== "string") return null;

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return {
    date: toDateKey(parsed),
    // Entries written before `done` existed were, by definition, completions.
    done: typeof done === "boolean" ? done : true,
    minutes: typeof minutes === "number" && minutes > 0 ? minutes : undefined,
  };
}

function sumMinutes(a: number | undefined, b: number | undefined) {
  const total = (a ?? 0) + (b ?? 0);
  return total > 0 ? total : undefined;
}

function migrateRunningSince(raw: unknown) {
  if (typeof raw !== "string") return undefined;

  const started = new Date(raw);
  if (Number.isNaN(started.getTime())) return undefined;

  // A timestamp in the future means a clock change; treat it as not running
  // rather than showing a negative stopwatch.
  return started.getTime() > Date.now() ? undefined : raw;
}

/**
 * Timers left running for longer than this are almost always a forgotten stop
 * rather than a real session, so we flag them instead of silently banking hours.
 */
export const STALE_TIMER_MS = 8 * 60 * 60 * 1000;

export function getElapsedMs(runningSince: string, now: number) {
  const started = new Date(runningSince).getTime();
  if (Number.isNaN(started)) return 0;

  // Clamp so a backwards clock adjustment cannot produce negative time.
  return Math.max(0, now - started);
}

export function isStaleTimer(runningSince: string, now: number) {
  return getElapsedMs(runningSince, now) >= STALE_TIMER_MS;
}

/**
 * Minutes a stopped timer should bank.
 *
 * Rounding to the nearest minute would throw away anything under 30 seconds,
 * so a short session would silently log nothing and the app would look broken.
 * Any session worth a second counts as at least a minute instead.
 */
export function msToLoggedMinutes(ms: number) {
  if (ms < 1000) return 0;
  return Math.max(1, Math.round(ms / 60_000));
}

/** Elapsed wall-clock time as H:MM:SS (or M:SS under an hour). */
export function formatStopwatch(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

