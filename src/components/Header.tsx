// import Button from "./Button";
// export default function Header() {
//   return (
//     <header className="flex items-center justify-between">
//       <div className="flex flex-col gap-1">
//         <h1 className="text-3xl font-bold">Habit Tracker</h1>
//         <span className="text-zinc-400 text-sm">1/1 done today</span>
//       </div>
//       <div className="flex flex-col gap-1 items-end">
//         <span className="text-zinc-400 text-sm">May 10 - May 12 </span>
//         <div className="flex items-center gap-3">
//         <Button >Prev</Button>
//         <Button>Next</Button>
//         </div>
//       </div>
//     </header>
//   );
// }

import Button from "./Button";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { isCompletedOn, type Habit } from "../lib/habits";
import { isSameDay } from "date-fns";

type HeaderProps = {
  habits: Habit[];
  currentWeekStart: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
};

export default function Header({ 
  habits, 
  currentWeekStart, 
  onPreviousWeek, 
  onNextWeek 
}: HeaderProps) {
  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
  
  // Calculate completed habits for today
  const today = new Date();
  const completedToday = habits.filter((habit) =>
    isCompletedOn(habit, today)
  ).length;
  
  const totalHabits = habits.length;
  const isCurrentWeek = isSameDay(startOfWeek(new Date(), { weekStartsOn: 1 }), currentWeekStart);

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex flex-col gap-0.5 sm:gap-1">
        <h1 className="flex items-center gap-2 text-2xl sm:text-3xl font-bold">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            Ember
          </span>
        </h1>
        <span className="text-zinc-400 text-xs sm:text-sm">
          {completedToday}/{totalHabits} done today
        </span>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center w-full sm:w-auto">
        <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 items-start sm:items-center w-full sm:w-auto">
          <span className="text-zinc-400 text-xs sm:text-sm">
            {format(currentWeekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
          </span>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button 
              onClick={onPreviousWeek}
              className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 py-1"
            >
              ← Prev
            </Button>
            <Button 
              onClick={onNextWeek}
              disabled={isCurrentWeek}
              className="flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-3 py-1"
            >
              Next →
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}