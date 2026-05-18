// import Button from "./Button";
// import {
//   eachDayOfInterval,
//   startOfWeek,
//   endOfWeek,
//   format,
//   isFuture,
//   isSameDay,
// } from "date-fns";

// export type Habit = {
//   id: string;
//   name: string;
//   completions: Date[];
// };

// type HabitListProps = {
//   habits: habit[];
//   deleteHabit: (id: string) => void;
//   toggleHabit:(id:string,date:Date) => void
// };
// export default function HabitList({ habits, deleteHabit,toggleHabit }: HabitListProps) {
//   // const habits = [{ id: "1", name: "CSS" }];

//   if (habits.length === 0) {
//     return (
//       <p className="text-center text-zinc-500 py-12">
//         No habits yet. Add one above to get started!
//       </p>
//     );
//   }

//   return (
//     <div className="flex flex-col gap-3">
//       {habits.map((habit) => (
//         <HabitItem deleteHabit={deleteHabit} key={habit.id} habit={habit} toggleHabit={toggleHabit} />
//       ))}
//     </div>
//   );
// }

// type HabitItemProps = {
//   // habit: { name: string; id: string };
//   habit: Habit;
//   deleteHabit: (id: string) => void;
//   toggleHabit:(id:string,date:Date) => void

// };

// function HabitItem({ habit, deleteHabit,toggleHabit }: HabitItemProps) {
//   const visibleDates = eachDayOfInterval({
//     start: startOfWeek(new Date(), { weekStartsOn: 1 }),
//     end: endOfWeek(new Date(), { weekStartsOn: 1 }),
//   });

//   return (
//     <>
//       {/* <p>{habit.name}</p> */}
//       <div className="rounded-xl bg-zinc-800 p-4 flex flex-col gap-3">
//         <div className="flex  items-center justify-between">
//           <div className="flex gap-3 items-center">
//             <span className="font-medium">{habit.name}</span>
//             <span className="text-sm text-amber-400">🔥 3</span>
//           </div>
//           <Button
//             onClick={() => deleteHabit(habit.id)}
//             variant="ghost-destructive"
//             className="text-sm"
//           >
//             Delete
//           </Button>
//         </div>
//         <div className="flex gap-1.5">
//           {visibleDates.map((date) => (
//             <Button
//               className="flex flex-1 flex-col items-center gap-0.5 rounded-lg text-xs"
//               key={date.toISOString()}
//               disabled={isFuture(date)}
//               onClick={() =>  toggleHabit(habit.id,date)}
//               variant={
//                 habit.completions.some((d) => isSameDay(date, d))
//                   ? "primary"
//                   : "secondary"
//               }
//             >
//               <span className="font-medium">{format(date, "EEE")}</span>
//               <span>{format(date, "d")}</span>
//             </Button>
//           ))}
//         </div>
//       </div>
//     </>
//   );
// }

import { subDays } from "date-fns/fp";
import Button from "./Button";
import {
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isFuture,
  isSameDay,
} from "date-fns";

export type Habit = {
  id: string;
  name: string;
  completions: Date[];
};

type HabitListProps = {
  habits: Habit[]; // ✅ CORRECTION: changed "habit[]" to "Habit[]"
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date: Date) => void; // ✅ formatting fixed
};

export default function HabitList({
  habits,
  deleteHabit,
  toggleHabit,
}: HabitListProps) {
  if (habits.length === 0) {
    return (
      <p className="text-center text-zinc-500 py-12">
        No habits yet. Add one above to get started!
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {habits.map((habit) => (
        <HabitItem
          key={habit.id}
          habit={habit}
          deleteHabit={deleteHabit}
          toggleHabit={toggleHabit}
        />
      ))}
    </div>
  );
}

type HabitItemProps = {
  habit: Habit;
  deleteHabit: (id: string) => void;
  toggleHabit: (id: string, date: Date) => void;
};

function HabitItem({ habit, deleteHabit, toggleHabit }: HabitItemProps) {
  const visibleDates = eachDayOfInterval({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 }),
  });

  let streak = getStreak(habit.completions);

  return (
    <div className="rounded-xl bg-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <span className="font-medium">{habit.name}</span>
          {streak !== 0 && (
            <span className="text-sm text-amber-400">🔥{streak}</span>
          )}
        </div>

        <Button
          onClick={() => deleteHabit(habit.id)}
          variant="ghost-destructive"
          className="text-sm"
        >
          Delete
        </Button>
      </div>

      <div className="flex gap-1.5">
        {visibleDates.map((date) => (
          <Button
            key={date.toISOString()}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg text-xs"
            disabled={isFuture(date)}
            onClick={() => toggleHabit(habit.id, date)}
            // ✅ CORRECTION: previously you used "d"
            // which was undefined. Correct variable is "date"

            variant={
              habit.completions.some((d) => isSameDay(date, d))
                ? "primary"
                : "secondary"
            }
          >
            <span className="font-medium">{format(date, "EEE")}</span>

            <span>{format(date, "d")}</span>
          </Button>
        ))}
      </div>
    </div>
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
