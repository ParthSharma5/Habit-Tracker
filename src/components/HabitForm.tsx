import { useState } from "react";
import Button from "./Button";

type HabitFormProps = {
  addHabit: (name: string, goalMinutes?: number) => void;
};

export default function HabitForm({ addHabit }: HabitFormProps) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim() === "") {
      return;
    }

    const goalMinutes = Number(goal);
    addHabit(name, goalMinutes > 0 ? goalMinutes : undefined);

    setName("");
    setGoal("");
  }

  return (
    <form className="flex flex-col sm:flex-row gap-2" onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 rounded-lg bg-zinc-800 px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        type="text"
        placeholder="New Habit...."
      />
      <div className="flex gap-2">
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full sm:w-36 rounded-lg bg-zinc-800 px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 placeholder:text-zinc-500"
          type="number"
          min={0}
          step={5}
          placeholder="Goal (min)"
          aria-label="Daily goal in minutes (optional)"
        />
        <Button
          disabled={name.trim() === ""}
          className="rounded-lg px-4 py-2 font-medium whitespace-nowrap"
        >
          Add Habit
        </Button>
      </div>
    </form>
  );
}
