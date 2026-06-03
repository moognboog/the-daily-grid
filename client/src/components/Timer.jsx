import { useState, useEffect, useRef } from 'react';

function fmt(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function Timer({ started, stopped, onTick }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (started && !stopped) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1;
          onTick?.(next);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [started, stopped]);

  return (
    <div className="text-lg font-mono font-semibold text-gray-700">
      {fmt(elapsed)}
    </div>
  );
}
