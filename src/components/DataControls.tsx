import { useRef, useState } from "react";
import Button from "./Button";
import { exportHabits, parseBackup } from "../lib/backup";
import type { Habit } from "../lib/habits";

type DataControlsProps = {
  habits: Habit[];
  replaceHabits: (habits: Habit[]) => void;
};

export default function DataControls({ habits, replaceHabits }: DataControlsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; bad?: boolean } | null>(null);
  const [pending, setPending] = useState<Habit[] | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset immediately so picking the same file twice still fires a change.
    e.target.value = "";
    if (!file) return;

    const result = parseBackup(await file.text());

    if (!result.ok) {
      setPending(null);
      setMessage({ text: result.error, bad: true });
      return;
    }

    // Importing replaces everything, so make it a deliberate two-step action.
    setPending(result.habits);
    setMessage(null);
  }

  function confirmImport() {
    if (!pending) return;

    replaceHabits(pending);
    setMessage({ text: `Imported ${describe(pending.length)}.` });
    setPending(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            exportHabits(habits);
            setMessage({ text: `Exported ${describe(habits.length)}.` });
          }}
          variant="secondary"
          disabled={habits.length === 0}
          className="text-xs sm:text-sm"
        >
          ↓ Export backup
        </Button>

        <Button
          onClick={() => fileInput.current?.click()}
          variant="secondary"
          className="text-xs sm:text-sm"
        >
          ↑ Import backup
        </Button>

        <input
          ref={fileInput}
          onChange={handleFile}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />

        <span className="text-xs text-zinc-500">
          Your data lives only in this browser.
        </span>
      </div>

      {pending && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2">
          <span className="text-xs sm:text-sm text-amber-200">
            Import {describe(pending.length)}? This replaces your current{" "}
            {describe(habits.length)}.
          </span>
          <div className="flex gap-1 ml-auto">
            <Button onClick={confirmImport} className="text-xs sm:text-sm">
              Replace
            </Button>
            <Button
              onClick={() => setPending(null)}
              variant="secondary"
              className="text-xs sm:text-sm"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p
          className={`text-xs sm:text-sm ${message.bad ? "text-red-300" : "text-emerald-300"}`}
          role="status"
        >
          {message.text}
        </p>
      )}
    </div>
  );
}

function describe(count: number) {
  return `${count} habit${count === 1 ? "" : "s"}`;
}
