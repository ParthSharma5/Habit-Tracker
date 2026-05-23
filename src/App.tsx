import Header from "./components/Header";
import HabitForm from "./components/HabitForm";
import HabitList, { type Habit } from "./components/HabitList";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { isSameDay, startOfWeek, addWeeks, subWeeks } from "date-fns";
import { useState } from "react";

export default function App() {
  const [habits, setHabits] = useLocalStorage<Habit[]>("habit-tracker-data", []);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  function addHabit(name: string) {
    setHabits((curr) => [
      ...curr,
      {
        id: crypto.randomUUID(),
        name,
        completions: [],
      },
    ]);
  }

  function deleteHabit(id: string) {
    setHabits((curr) => curr.filter((h) => h.id !== id));
  }

  function toggleHabit(id: string, date: Date) {
    setHabits((curr) =>
      curr.map((h) => {
        if (h.id !== id) return h;

        const alreadyDone = h.completions.some((c) => isSameDay(c, date));

        const completions = alreadyDone
          ? h.completions.filter((c) => !isSameDay(c, date))
          : [...h.completions, date];

        return {
          ...h,
          completions,
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
          currentWeekStart={currentWeekStart}
        />
      </div>
    </div>
  );
}