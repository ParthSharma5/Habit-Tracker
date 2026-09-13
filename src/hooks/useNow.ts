import { useEffect, useState } from "react";

/**
 * Current wall-clock time, re-read every `intervalMs` while `active`.
 *
 * The interval only drives re-renders — elapsed time is always computed from a
 * stored start timestamp against this value, so a throttled or paused timer in a
 * background tab catches up correctly instead of drifting.
 */
export function useNow(active: boolean, intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;

    const id = setInterval(() => setNow(Date.now()), intervalMs);

    // Background tabs throttle timers, so resync as soon as we are visible again.
    const onVisible = () => {
      if (!document.hidden) setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, intervalMs]);

  return now;
}
