import { useState } from "react";
import Button from "./Button";

type HabitFormProps = {
  addHabit: (name: string) => void;
};

export default function HabitForm({ addHabit }: HabitFormProps) {
  const [name, setName] = useState("");

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (name.trim() === "") {
      return;
    }
    addHabit(name);
    console.log(name);
    setName(name);
    setName("");
  }

  return (
    <>
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-lg bg-zinc-800 px-4
        py-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-500
        "
          type="text"
          placeholder="New Habit.... "
        />
        <Button
          // mtlb jb khaali space content hoga toh button disable rahega

          disabled={name.trim() === ""}
          className="rounded-lg px-4 py-2 font-medium"
        >
          Add Habit
        </Button>
      </form>
    </>
  );
}
