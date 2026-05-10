export default function HabitList() {
  const habits = [
    { id: "1", name: "CSS" },
    { id: "2", name: "Ielts" },
    { id: "3", name: "DSA" },
    { id: "4", name: "Achieve" },
  ];

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
        <HabitItem key={habit.id} habit={habit} />
      ))}
    </div>
  );
}

type HabitItemProps = {
  habit: { name: string; id: string };
};

function HabitItem({ habit }: HabitItemProps) {
  return <p>{habit.name}</p>;
}