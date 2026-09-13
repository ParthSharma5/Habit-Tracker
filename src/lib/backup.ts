import { migrateHabits, toDateKey, type Habit } from "./habits";

const FORMAT = "ember-habits";
const VERSION = 1;

type BackupFile = {
  format: string;
  version: number;
  exportedAt: string;
  habits: Habit[];
};

/**
 * Everything lives in one browser's localStorage, so a backup is the only thing
 * standing between a cleared site-data dialog and losing every record.
 */
export function exportHabits(habits: Habit[]) {
  const payload: BackupFile = {
    format: FORMAT,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    habits,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ember-backup-${toDateKey(new Date())}.json`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ImportResult =
  | { ok: true; habits: Habit[] }
  | { ok: false; error: string };

/**
 * Accepts either a backup file or a bare array of habits, and runs everything
 * through the same migration the app uses at startup — so an older export, or a
 * file hand-edited into a slightly wrong shape, still loads rather than
 * corrupting state.
 */
export function parseBackup(text: string): ImportResult {
  let raw: unknown;

  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file is not valid JSON." };
  }

  const candidate = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw !== null
      ? (raw as Partial<BackupFile>).habits
      : undefined;

  if (!Array.isArray(candidate)) {
    return {
      ok: false,
      error: "No habits found in that file — is it an Ember backup?",
    };
  }

  const habits = migrateHabits(candidate);

  if (habits.length === 0 && candidate.length > 0) {
    return { ok: false, error: "That file held no habits we could read." };
  }

  return { ok: true, habits };
}

export function readFileAsText(file: File) {
  return file.text();
}
