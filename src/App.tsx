import Header from "./components/Header";
import HabitForm from "./components/HabitForm";
import HabitList from "./components/HabitList";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  getElapsedMs,
  isEmptyCompletion,
  msToLoggedMinutes,
  migrateHabits,
  toDateKey,
  type Habit,
} from "./lib/habits";
import { startOfWeek, addWeeks, subWeeks } from "date-fns";
import { useState } from "react";

export default function App() {
  const [habits, setHabits] = useLocalStorage<Habit[]>(
    "habit-tracker-data",
    [],
    migrateHabits,
  );
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  function addHabit(name: string, goalMinutes?: number) {
    setHabits((curr) => [
      ...curr,
      {
        id: crypto.randomUUID(),
        name,
        goalMinutes,
        completions: [],
      },
    ]);
  }

  function deleteHabit(id: string) {
    setHabits((curr) => curr.filter((h) => h.id !== id));
  }

  /**
   * Ticking a day off and on again only flips `done` — any minutes logged for
   * that day are left alone, so you never lose tracked time to a stray tap.
   * The entry is dropped only once it holds neither a tick nor any time.
   */
  function toggleHabit(id: string, date: Date) {
    const key = toDateKey(date);

    setHabits((curr) =>
      curr.map((h) => {
        if (h.id !== id) return h;

        const existing = h.completions.find((c) => c.date === key);

        const completions = existing
          ? h.completions
              .map((c) => (c.date === key ? { ...c, done: !c.done } : c))
              .filter((c) => !isEmptyCompletion(c))
          : [...h.completions, { date: key, done: true }];

        return {
          ...h,
          completions: sortByDate(completions),
        };
      }),
    );
  }

  /**
   * Logging time also marks the day done, so you never have to tap twice.
   * Zero minutes clears the time but leaves the day completed.
   */
  function logTime(id: string, date: Date, minutes: number) {
    const key = toDateKey(date);

    setHabits((curr) =>
      curr.map((h) => {
        if (h.id !== id) return h;

        const existing = h.completions.find((c) => c.date === key);
        const entry = {
          date: key,
          // Logging time ticks the day off, and clearing it back to zero does
          // not untick a day you had already marked done.
          done: true,
          minutes: minutes > 0 ? minutes : undefined,
        };

        const completions = existing
          ? h.completions.map((c) => (c.date === key ? entry : c))
          : [...h.completions, entry];

        return {
          ...h,
          completions: sortByDate(completions),
        };
      }),
    );
  }

  /**
   * Sets or clears a habit's daily goal after creation — without this the goal
   * could only ever be chosen when the habit was first added.
   */
  function setGoal(id: string, goalMinutes?: number) {
    setHabits((curr) =>
      curr.map((h) => {
        if (h.id !== id) return h;

        const { goalMinutes: previous, ...rest } = h;
        void previous;

        return goalMinutes && goalMinutes > 0 ? { ...rest, goalMinutes } : rest;
      }),
    );
  }

  function startTimer(id: string) {
    const startedAt = new Date().toISOString();

    setHabits((curr) =>
      curr.map((h) => (h.id === id ? { ...h, runningSince: startedAt } : h)),
    );
  }

  /**
   * Banks the elapsed time against the day the timer *started* — a session that
   * crosses midnight belongs to the evening you began it, not the small hours.
   * `discard` throws the session away, for the times you forgot to stop.
   */
  function stopTimer(id: string, discard = false) {
    setHabits((curr) =>
      curr.map((h) => {
        if (h.id !== id || !h.runningSince) return h;

        const { runningSince, ...rest } = h;
        if (discard) return rest;

        const minutes = msToLoggedMinutes(getElapsedMs(runningSince, Date.now()));
        const key = toDateKey(new Date(runningSince));
        const existing = rest.completions.find((c) => c.date === key);

        // Timer sessions add to the day; they never overwrite what is there.
        const total = (existing?.minutes ?? 0) + minutes;
        const entry = { date: key, done: true, minutes: total > 0 ? total : undefined };

        return {
          ...rest,
          completions: sortByDate(
            existing
              ? rest.completions.map((c) => (c.date === key ? entry : c))
              : [...rest.completions, entry],
          ),
        };
      }),
    );
  }

  function handlePreviousWeek() {
    setCurrentWeekStart((curr) => subWeeks(curr, 1));
  }

  function handleNextWeek() {
    setCurrentWeekStart((curr) => addWeeks(curr, 1));
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 flex flex-col gap-4 sm:gap-6">
        <Header 
          habits={habits}
          currentWeekStart={currentWeekStart}
          onPreviousWeek={handlePreviousWeek}
          onNextWeek={handleNextWeek}
        />
        <HabitForm addHabit={addHabit} />
        <HabitList
          habits={habits}
          deleteHabit={deleteHabit}
          toggleHabit={toggleHabit}
          logTime={logTime}
          setGoal={setGoal}
          startTimer={startTimer}
          stopTimer={stopTimer}
          currentWeekStart={currentWeekStart}
        />
      </div>
    </div>
  );
}

function sortByDate<T extends { date: string }>(entries: T[]) {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date));
}
