import { useEffect, useState } from "react";
import Button from "./Button";
import HabitHistory from "./HabitHistory";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isFuture,
  isToday,
} from "date-fns";
import { useNow } from "../hooks/useNow";
import {
  countGoalDays,
  formatMinutes,
  formatStopwatch,
  fromDateKey,
  getElapsedMs,
  getMinutesOn,
  getGoalProgress,
  getStreak,
  hasMetGoal,
  hasUntickedTime,
  isCompletedOn,
  isStaleTimer,
  msToLoggedMinutes,
  toDateKey,
  type Habit,
} from "../lib/habits";

type TimerHandlers = {
  startTimer: (id: string) => void;
  stopTimer: (id: string, discard?: boolean) => void;
};

type GoalHandler = {
  setGoal: (id: string, goalMinutes?: number) => void;
};

type HabitListProps = TimerHandlers & GoalHandler & {
  habits: Habit[];
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date: Date) => void;
  logTime: (id: string, date: Date, minutes: number) => void;
  currentWeekStart: Date;
};

export default function HabitList({
  habits,
  deleteHabit,
  toggleHabit,
  logTime,
  setGoal,
  startTimer,
  stopTimer,
  currentWeekStart,
}: HabitListProps) {
  if (habits.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 md:py-16">
        <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">🎯</div>
        <p className="text-zinc-500 text-sm sm:text-base md:text-lg">
          No habits yet. Add one above to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          deleteHabit={deleteHabit}
          toggleHabit={toggleHabit}
          logTime={logTime}
          setGoal={setGoal}
          startTimer={startTimer}
          stopTimer={stopTimer}
          currentWeekStart={currentWeekStart}
        />
      ))}
    </div>
  );
}

type HabitItemProps = TimerHandlers & GoalHandler & {
  habit: Habit;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date: Date) => void;
  logTime: (id: string, date: Date, minutes: number) => void;
  currentWeekStart: Date;
};

function HabitItem({
  habit,
  deleteHabit,
  toggleHabit,
  logTime,
  setGoal,
  startTimer,
  stopTimer,
  currentWeekStart,
}: HabitItemProps) {
  const [isLogging, setIsLogging] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // Short sessions barely move the weekly total, so confirm the save explicitly
  // rather than leaving you wondering whether the click registered.
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    if (!flash) return;

    const id = setTimeout(() => setFlash(null), 4000);
    return () => clearTimeout(id);
  }, [flash]);

  const visibleDates = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const streak = getStreak(habit.completions);
  const weekMinutes = visibleDates.reduce(
    (total, date) => total + getMinutesOn(habit, date),
    0,
  );
  const goalDays = countGoalDays(habit, visibleDates);

  return (
    <div className="rounded-xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 p-3 sm:p-4 md:p-5 flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <span className="font-medium text-sm sm:text-base md:text-lg truncate">
            {habit.name}
          </span>
          {streak > 0 && (
            <span className="text-xs sm:text-sm text-amber-400 flex items-center gap-1 whitespace-nowrap">
              <span>🔥</span>
              <span className="font-medium">{streak}</span>
              <span className="hidden sm:inline">day streak</span>
            </span>
          )}
          {weekMinutes > 0 && (
            <span className="text-xs sm:text-sm text-zinc-400 whitespace-nowrap">
              ⏱ {formatMinutes(weekMinutes)}
              <span className="hidden sm:inline"> this week</span>
            </span>
          )}
          {/* The goal is editable here, not only when the habit is created. */}
          <button
            type="button"
            onClick={() => setIsEditingGoal((curr) => !curr)}
            aria-expanded={isEditingGoal}
            className={`text-xs whitespace-nowrap rounded px-1.5 py-0.5 transition-colors ${
              habit.goalMinutes
                ? "text-emerald-300 hover:bg-emerald-950/40"
                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/40"
            }`}
          >
            {habit.goalMinutes
              ? `🎯 ${formatMinutes(habit.goalMinutes)}/day · ${goalDays}/${visibleDates.length}`
              : "+ Set goal"}
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* While running, the banner below owns Stop — no second control. */}
          {!habit.runningSince && (
            <Button
              onClick={() => startTimer(habit.id)}
              variant="secondary"
              className="text-xs sm:text-sm"
            >
              ▶ Start
            </Button>
          )}
          <Button
            onClick={() => setIsLogging((curr) => !curr)}
            variant="secondary"
            className="text-xs sm:text-sm"
            aria-expanded={isLogging}
          >
            {isLogging ? "Close" : "Log time"}
          </Button>
          <Button
            onClick={() => setShowHistory((curr) => !curr)}
            variant="secondary"
            className="text-xs sm:text-sm"
            aria-expanded={showHistory}
          >
            {showHistory ? "Hide history" : "History"}
          </Button>
          {/* Deleting destroys every record for this habit, so it takes two
              deliberate clicks rather than one stray one. */}
          {confirmingDelete ? (
            <span className="flex items-center gap-1">
              <Button
                onClick={() => deleteHabit(habit.id)}
                className="text-xs sm:text-sm bg-red-700 hover:bg-red-600"
              >
                Delete forever
              </Button>
              <Button
                onClick={() => setConfirmingDelete(false)}
                variant="secondary"
                className="text-xs sm:text-sm"
              >
                Cancel
              </Button>
            </span>
          ) : (
            <Button
              onClick={() => setConfirmingDelete(true)}
              variant="ghost-destructive"
              className="text-xs sm:text-sm"
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      {habit.runningSince && (
        <RunningTimer
          runningSince={habit.runningSince}
          onStop={(minutes, dayLabel) => {
            stopTimer(habit.id);
            setFlash(`Saved ${formatMinutes(minutes)} to ${dayLabel}`);
          }}
          onDiscard={() => {
            stopTimer(habit.id, true);
            setFlash("Session discarded — nothing logged");
          }}
        />
      )}

      {isEditingGoal && (
        <GoalForm
          key={habit.goalMinutes ?? "none"}
          goalMinutes={habit.goalMinutes}
          onSubmit={(minutes) => {
            setGoal(habit.id, minutes);
            setIsEditingGoal(false);
            setFlash(
              minutes
                ? `Daily goal set to ${formatMinutes(minutes)}`
                : "Daily goal cleared",
            );
          }}
        />
      )}

      {flash && (
        <p
          className="text-xs sm:text-sm text-emerald-300 bg-emerald-950/30 rounded-lg px-3 py-1.5"
          role="status"
        >
          {flash}
        </p>
      )}

      {/* Desktop: Show full day names */}
      <div className="hidden sm:flex gap-1 sm:gap-1.5 md:gap-2">
        {visibleDates.map((date) => (
          <DayButton
            key={date.toISOString()}
            date={date}
            habit={habit}
            onClick={() => toggleHabit(habit.id, date)}
            showFullDay
          />
        ))}
      </div>

      {/* Mobile: Show abbreviated day names */}
      <div className="flex sm:hidden gap-1">
        {visibleDates.map((date) => (
          <DayButton
            key={date.toISOString()}
            date={date}
            habit={habit}
            onClick={() => toggleHabit(habit.id, date)}
            showFullDay={false}
          />
        ))}
      </div>

      {showHistory && <HabitHistory habit={habit} />}

      {isLogging && (
        <TimeForm
          // Re-seed the form when the visible week changes, so the day picker
          // never points at a date that is no longer on screen.
          key={toDateKey(currentWeekStart)}
          habit={habit}
          visibleDates={visibleDates}
          onSubmit={(date, minutes) => {
            logTime(habit.id, date, minutes);
            setIsLogging(false);
          }}
        />
      )}
    </div>
  );
}

type GoalFormProps = {
  goalMinutes?: number;
  /** `undefined` clears the goal. */
  onSubmit: (goalMinutes?: number) => void;
};

function GoalForm({ goalMinutes, onSubmit }: GoalFormProps) {
  const [value, setValue] = useState(() => String(goalMinutes ?? ""));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const minutes = Number(value);
    onSubmit(minutes > 0 ? minutes : undefined);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-2 border-t border-zinc-700/50 pt-3"
    >
      <label className="text-xs sm:text-sm text-zinc-400">Daily goal</label>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-28 rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500 placeholder:text-zinc-500"
        type="number"
        min={0}
        step={5}
        placeholder="Minutes"
        aria-label="Daily goal in minutes"
        autoFocus
      />
      <Button className="rounded-lg px-4 py-2 text-sm font-medium">Save</Button>
      {goalMinutes !== undefined && (
        <Button
          type="button"
          onClick={() => onSubmit(undefined)}
          variant="ghost-destructive"
          className="text-sm"
        >
          Clear goal
        </Button>
      )}
    </form>
  );
}

type RunningTimerProps = {
  runningSince: string;
  onStop: (minutes: number, dayLabel: string) => void;
  onDiscard: () => void;
};

function RunningTimer({ runningSince, onStop, onDiscard }: RunningTimerProps) {
  const now = useNow(true);
  const elapsed = getElapsedMs(runningSince, now);
  const stale = isStaleTimer(runningSince, now);

  const startedOn = new Date(runningSince);
  // What Stop would bank right now, so there is no surprise in the rounding.
  const pending = msToLoggedMinutes(elapsed);

  function handleStop() {
    onStop(pending, isToday(startedOn) ? "today" : format(startedOn, "MMM d"));
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 sm:gap-3 rounded-lg px-3 py-2 border ${
        stale
          ? "bg-amber-950/40 border-amber-700/50"
          : "bg-emerald-950/40 border-emerald-700/50"
      }`}
    >
      <span
        className={`relative flex h-2 w-2 shrink-0 ${stale ? "" : "animate-pulse"}`}
        aria-hidden="true"
      >
        <span
          className={`h-2 w-2 rounded-full ${stale ? "bg-amber-400" : "bg-emerald-400"}`}
        />
      </span>

      <span
        className="font-mono text-base sm:text-lg tabular-nums"
        role="timer"
        aria-live="off"
      >
        {formatStopwatch(elapsed)}
      </span>

      <span className="text-xs text-zinc-400">
        since {format(startedOn, "MMM d, HH:mm")} · will log{" "}
        <span className="text-zinc-200">{formatMinutes(pending)}</span>
      </span>

      {stale && (
        <span className="text-xs text-amber-300 basis-full sm:basis-auto">
          Running over 8 hours — forgot to stop? Discard it and log the time by hand.
        </span>
      )}

      <div className="flex gap-1 ml-auto">
        <Button
          onClick={handleStop}
          className="text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-500"
        >
          Stop &amp; save
        </Button>
        <Button
          onClick={onDiscard}
          variant="ghost-destructive"
          className="text-xs sm:text-sm"
          title="Throw this session away without logging it"
        >
          Discard
        </Button>
      </div>
    </div>
  );
}

type TimeFormProps = {
  habit: Habit;
  visibleDates: Date[];
  onSubmit: (date: Date, minutes: number) => void;
};

function TimeForm({ habit, visibleDates, onSubmit }: TimeFormProps) {
  // You can only log against a day that has already happened.
  const selectableDates = visibleDates.filter((date) => !isFuture(date));
  const defaultDate =
    selectableDates.find((date) => isToday(date)) ?? selectableDates.at(-1);

  const [dateKey, setDateKey] = useState(() =>
    defaultDate ? toDateKey(defaultDate) : "",
  );
  const [minutes, setMinutes] = useState(() =>
    defaultDate ? String(getMinutesOn(habit, defaultDate) || "") : "",
  );

  if (!defaultDate) {
    return (
      <p className="text-xs sm:text-sm text-zinc-500 border-t border-zinc-700/50 pt-3">
        This week hasn&apos;t started yet — nothing to log.
      </p>
    );
  }

  function handleDateChange(nextKey: string) {
    setDateKey(nextKey);
    // Show whatever is already logged for the newly picked day.
    setMinutes(String(getMinutesOn(habit, fromDateKey(nextKey)) || ""));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(fromDateKey(dateKey), Math.max(0, Number(minutes) || 0));
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row sm:items-center gap-2 border-t border-zinc-700/50 pt-3"
    >
      <select
        value={dateKey}
        onChange={(e) => handleDateChange(e.target.value)}
        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        aria-label="Day to log time against"
      >
        {selectableDates.map((date) => (
          <option key={toDateKey(date)} value={toDateKey(date)}>
            {isToday(date) ? "Today" : format(date, "EEEE, MMM d")}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-full sm:w-32 rounded-lg bg-zinc-800 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-violet-500 placeholder:text-zinc-500"
          type="number"
          min={0}
          step={5}
          placeholder="Minutes"
          aria-label="Minutes spent"
        />
        <Button className="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap">
          Save
        </Button>
      </div>

      {habit.goalMinutes ? (
        <span className="text-xs text-zinc-500">
          Goal: {formatMinutes(habit.goalMinutes)}/day
        </span>
      ) : null}
    </form>
  );
}

type DayButtonProps = {
  date: Date;
  habit: Habit;
  onClick: () => void;
  showFullDay: boolean;
};

function DayButton({ date, habit, onClick, showFullDay }: DayButtonProps) {
  const today = isToday(date);
  const isCompleted = isCompletedOn(habit, date);
  const minutes = getMinutesOn(habit, date);
  const metGoal = hasMetGoal(habit, date);
  const progress = getGoalProgress(habit, date);
  // Time kept on a day that is not ticked off — dashed edge so it is clear the
  // minutes are still there, waiting.
  const untickedTime = hasUntickedTime(habit, date);

  return (
    <Button
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg text-xs py-1.5 sm:py-2 ${
        today ? "ring-1 ring-violet-400" : ""
      } ${untickedTime ? "border border-dashed border-violet-400/60" : ""}`}
      disabled={isFuture(date)}
      onClick={onClick}
      variant={isCompleted ? "primary" : "secondary"}
      title={buildDayTitle(date, minutes, isCompleted, habit.goalMinutes)}
    >
      <span className={`font-medium ${showFullDay ? "" : "text-[10px]"}`}>
        {showFullDay ? format(date, "EEE") : format(date, "EEEEE")}
      </span>
      <span className={showFullDay ? "text-sm" : "text-xs"}>
        {format(date, "d")}
      </span>
      {minutes > 0 && (
        <span
          className={`text-[10px] leading-none ${
            metGoal ? "text-emerald-300" : "text-zinc-200/80"
          }`}
        >
          {formatMinutes(minutes)}
        </span>
      )}

      {/* Progress toward the daily goal, so the goal is visible on the grid
          itself rather than only as a colour change on the minutes label. */}
      {progress !== null && (
        <span className="w-full px-1" aria-hidden="true">
          <span className="block h-1 w-full rounded-full bg-black/30 overflow-hidden">
            <span
              className={`block h-full rounded-full ${
                metGoal ? "bg-emerald-400" : "bg-amber-400"
              }`}
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </span>
        </span>
      )}
    </Button>
  );
}

function buildDayTitle(
  date: Date,
  minutes: number,
  isCompleted: boolean,
  goalMinutes?: number,
) {
  const day = format(date, "EEEE, MMM d");
  if (minutes === 0) {
    return goalMinutes ? `${day} — goal ${formatMinutes(goalMinutes)}` : day;
  }

  const time = goalMinutes
    ? `${formatMinutes(minutes)} of ${formatMinutes(goalMinutes)}`
    : formatMinutes(minutes);

  return isCompleted
    ? `${day} — ${time} logged`
    : `${day} — ${time} logged, not ticked off`;
}
