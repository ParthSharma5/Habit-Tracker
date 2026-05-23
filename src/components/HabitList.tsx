import { subDays } from "date-fns";
import Button from "./Button";
import {
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isFuture,
  isSameDay,
  isToday,
} from "date-fns";

export type Habit = {
  id: string;
  name: string;
  completions: Date[];
};

type HabitListProps = {
  habits: Habit[];
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date: Date) => void;
  currentWeekStart: Date;
};

export default function HabitList({
  habits,
  deleteHabit,
  toggleHabit,
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
          currentWeekStart={currentWeekStart}
        />
      ))}
    </div>
  );
}

type HabitItemProps = {
  habit: Habit;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date: Date) => void;
  currentWeekStart: Date;
};

function HabitItem({ habit, deleteHabit, toggleHabit, currentWeekStart }: HabitItemProps) {
  const visibleDates = eachDayOfInterval({
    start: currentWeekStart,
    end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
  });

  const streak = getStreak(habit.completions);

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
        </div>
        <Button
          onClick={() => deleteHabit(habit.id)}
          variant="ghost-destructive"
          className="text-xs sm:text-sm shrink-0"
        >
          Delete
        </Button>
      </div>
      
      {/* Desktop: Show full day names */}
      <div className="hidden sm:flex gap-1 sm:gap-1.5 md:gap-2">
        {visibleDates.map((date) => (
          <DayButton
            key={date.toISOString()}
            date={date}
            isCompleted={habit.completions.some((d) => isSameDay(date, d))}
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
            isCompleted={habit.completions.some((d) => isSameDay(date, d))}
            onClick={() => toggleHabit(habit.id, date)}
            showFullDay={false}
          />
        ))}
      </div>
    </div>
  );
}

type DayButtonProps = {
  date: Date;
  isCompleted: boolean;
  onClick: () => void;
  showFullDay: boolean;
};

function DayButton({ date, isCompleted, onClick, showFullDay }: DayButtonProps) {
  const today = isToday(date);
  
  return (
    <Button
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg text-xs py-1.5 sm:py-2 ${
        today ? 'ring-1 ring-violet-400' : ''
      }`}
      disabled={isFuture(date)}
      onClick={onClick}
      variant={isCompleted ? "primary" : "secondary"}
    >
      <span className={`font-medium ${showFullDay ? '' : 'text-[10px]'}`}>
        {showFullDay ? format(date, "EEE") : format(date, "EEEEE")}
      </span>
      <span className={showFullDay ? 'text-sm' : 'text-xs'}>
        {format(date, "d")}
      </span>
    </Button>
  );
}

function getStreak(completions: Date[]) {
  let streak = 0;
  let date = new Date();
  
  while (completions.some((c) => isSameDay(c, date))) {
    streak++;
    date = subDays(date, 1);
  }
  
  return streak;
}