import { useState } from "react";

/**
 * @param migrate Runs on the parsed value before it reaches state, so data
 * written by an older version of the app can be upgraded in place.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  migrate?: (raw: unknown) => T,
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;

      const parsed: unknown = JSON.parse(item);
      return migrate ? migrate(parsed) : (parsed as T);
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}
