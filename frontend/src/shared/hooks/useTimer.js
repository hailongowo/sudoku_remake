import { useEffect, useState } from "react";

export function useTimer(startedAt, paused = false) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) {
      setElapsed(0);
      return undefined;
    }

    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)));
    };
    update();

    if (paused) return undefined;
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [paused, startedAt]);

  return elapsed;
}
