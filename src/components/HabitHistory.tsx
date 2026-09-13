import { eachDayOfInterval, endOfWeek, format, isFuture, startOfWeek, subWeeks } from "date-fns";
import {
  formatMinutes,
  getBestStreak,
  getBusiestMinutes,
  getCompletionRate,
  getDayIntensity,
  getDoneCount,
  getFirstTrackedDate,
  getMinutesOn,
  getTotalMinutes,
  isCompletedOn,
  type Habit,
} from "../lib/habits";

const WEEKS = 26;

type HabitHistoryProps = {
  habit: Habit;
};

export default function HabitHistory({ habit }: HabitHistoryProps) {
  const weeks = buildWeeks(WEEKS);
  const busiest = getBusiestMinutes(habit);

  const bestStreak = getBestStreak(habit.completions);
  const rate = getCompletionRate(habit);
  const totalMinutes = getTotalMinutes(habit);
  const firstTracked = getFirstTrackedDate(habit);

  return (
    <div className="flex flex-col gap-3 border-t border-zinc-700/50 pt-3">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Stat label="Best streak" value={bestStreak > 0 ? `${bestStreak}d` : "—"} />
        <Stat label="Days done" value={String(getDoneCount(habit))} />
        <Stat
          label="Completion"
          value={rate === null ? "—" : `${Math.round(rate * 100)}%`}
        />
        <Stat
          label="Total time"
          value={totalMinutes > 0 ? formatMinutes(totalMinutes) : "—"}
        />
      </div>

      {/* Horizontal scroll keeps the grid intact on a phone rather than
          squashing cells until they stop being readable. */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-[3px] w-max">
          {weeks.map((week) => (
            <div key={week[0].toISOString()} className="flex flex-col gap-[3px]">
              {week.map((date) => (
                <Cell
                  key={date.toISOString()}
                  habit={habit}
                  date={date}
                  busiest={busiest}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-500">
        <span>
          {firstTracked
            ? `Tracking since ${format(firstTracked, "MMM d, yyyy")}`
            : "No history yet"}
        </span>
        <span className="flex items-center gap-1">
          Less
          {[0, 0.25, 0.5, 0.75, 1].map((level) => (
            <span
              key={level}
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: intensityColor(level) }}
            />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-sm sm:text-base font-medium">{value}</span>
    </div>
  );
}

type CellProps = {
  habit: Habit;
  date: Date;
  busiest: number;
};

function Cell({ habit, date, busiest }: CellProps) {
  if (isFuture(date)) {
    return <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm opacity-0" />;
  }

  const intensity = getDayIntensity(habit, date, busiest);
  const minutes = getMinutesOn(habit, date);
  const done = isCompletedOn(habit, date);

  const detail = minutes > 0 ? ` — ${formatMinutes(minutes)}` : done ? " — done" : "";

  return (
    <span
      className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm"
      style={{ backgroundColor: intensityColor(intensity) }}
      title={`${format(date, "EEE, MMM d yyyy")}${detail}`}
    />
  );
}

/** Violet ramp matching the app's accent, on the card background. */
function intensityColor(intensity: number) {
  if (intensity <= 0) return "rgba(255,255,255,0.06)";

  // 0.25 is the floor for "done", so map 0.25..1 across the visible ramp.
  const t = Math.min(1, Math.max(0, (intensity - 0.25) / 0.75));
  const alpha = 0.3 + t * 0.7;

  return `rgba(167, 139, 250, ${alpha.toFixed(2)})`;
}

/** Full weeks, oldest first, each running Monday to Sunday. */
function buildWeeks(count: number) {
  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });

  return Array.from({ length: count }, (_, i) => {
    const start = subWeeks(thisWeek, count - 1 - i);
    return eachDayOfInterval({
      start,
      end: endOfWeek(start, { weekStartsOn: 1 }),
    });
  });
}
