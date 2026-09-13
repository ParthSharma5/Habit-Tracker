import { useRef, useState } from "react";
import { eachDayOfInterval, endOfWeek, format, isFuture, isToday, startOfWeek, subWeeks } from "date-fns";
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
  hasMetGoal,
  isCompletedOn,
  type Habit,
} from "../lib/habits";

const WEEKS = 26;

type HabitHistoryProps = {
  habit: Habit;
};

type Hovered = {
  date: Date;
  /** Offset within the wrapper, so the tooltip tracks horizontal scrolling. */
  x: number;
  y: number;
};

/** Half the tooltip's minimum width, used to keep it inside the card. */
const TOOLTIP_MARGIN = 70;

export default function HabitHistory({ habit }: HabitHistoryProps) {
  const weeks = buildWeeks(WEEKS);
  const busiest = getBusiestMinutes(habit);

  const wrapper = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<Hovered | null>(null);

  const bestStreak = getBestStreak(habit.completions);
  const rate = getCompletionRate(habit);
  const totalMinutes = getTotalMinutes(habit);
  const firstTracked = getFirstTrackedDate(habit);

  function showTooltip(date: Date, cell: HTMLElement) {
    const bounds = wrapper.current?.getBoundingClientRect();
    if (!bounds) return;

    const rect = cell.getBoundingClientRect();

    // Both rects are viewport-relative, so subtracting handles scroll for us.
    const x = rect.left - bounds.left + rect.width / 2;

    setHovered({
      date,
      // Clamp here rather than at render time: the measurement belongs with the
      // event, and reading layout during render is not allowed.
      x: Math.min(Math.max(x, TOOLTIP_MARGIN), Math.max(bounds.width - TOOLTIP_MARGIN, TOOLTIP_MARGIN)),
      y: rect.top - bounds.top,
    });
  }

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

      {/* The tooltip lives outside the scroll container: `overflow-x` forces the
          vertical axis to scroll too, which would otherwise clip it. */}
      <div ref={wrapper} className="relative" onPointerLeave={() => setHovered(null)}>
        <div className="overflow-x-auto -mx-1 px-1 pt-1">
          <div className="flex gap-[3px] w-max">
            {weeks.map((week) => (
              <div key={week[0].toISOString()} className="flex flex-col gap-[3px]">
                {week.map((date) => (
                  <Cell
                    key={date.toISOString()}
                    habit={habit}
                    date={date}
                    busiest={busiest}
                    onShow={showTooltip}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {hovered && (
          <Tooltip habit={habit} hovered={hovered} />
        )}
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

type TooltipProps = {
  habit: Habit;
  hovered: Hovered;
};

function Tooltip({ habit, hovered }: TooltipProps) {
  const { date, x, y } = hovered;

  const minutes = getMinutesOn(habit, date);
  const done = isCompletedOn(habit, date);

  const detail = minutes > 0
    ? `${formatMinutes(minutes)}${habit.goalMinutes ? ` of ${formatMinutes(habit.goalMinutes)}` : ""}${done ? "" : " · not ticked"}`
    : done
      ? "Done — no time logged"
      : "Nothing logged";

  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-zinc-600 bg-zinc-900 px-2.5 py-1.5 shadow-lg shadow-black/40"
      style={{ left: x, top: y - 8 }}
    >
      <div className="text-xs font-medium text-zinc-100">
        {format(date, "EEE, MMM d yyyy")}
        {isToday(date) && <span className="text-violet-300"> · today</span>}
      </div>
      <div
        className={`text-[11px] ${
          hasMetGoal(habit, date) ? "text-emerald-300" : "text-zinc-400"
        }`}
      >
        {detail}
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
  onShow: (date: Date, cell: HTMLElement) => void;
};

function Cell({ habit, date, busiest, onShow }: CellProps) {
  if (isFuture(date)) {
    return <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm opacity-0" />;
  }

  const intensity = getDayIntensity(habit, date, busiest);
  const minutes = getMinutesOn(habit, date);
  const done = isCompletedOn(habit, date);

  const label = `${format(date, "EEEE, MMMM d yyyy")} — ${
    minutes > 0 ? `${formatMinutes(minutes)} logged` : done ? "done" : "nothing logged"
  }`;

  return (
    <span
      // Pointer events cover mouse and touch, so a tap shows the date too.
      onPointerEnter={(e) => onShow(date, e.currentTarget)}
      onPointerDown={(e) => onShow(date, e.currentTarget)}
      className={`h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm cursor-pointer transition-shadow hover:ring-1 hover:ring-violet-300 ${
        isToday(date) ? "ring-1 ring-violet-400" : ""
      }`}
      style={{ backgroundColor: intensityColor(intensity) }}
      aria-label={label}
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
