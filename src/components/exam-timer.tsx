"use client";

import { useEffect, useMemo, useState } from "react";

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function ExamTimer({ expiresAt, formId }: { expiresAt: string; formId: string }) {
  const deadline = useMemo(() => new Date(expiresAt).getTime(), [expiresAt]);
  const [remaining, setRemaining] = useState(() => deadline - Date.now());

  useEffect(() => {
    const tick = () => {
      const next = deadline - Date.now();
      setRemaining(next);
      if (next <= 0) {
        const form = document.getElementById(formId) as HTMLFormElement | null;
        form?.requestSubmit();
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [deadline, formId]);

  return (
    <div className="exam-timer" role="timer" aria-live="polite" data-urgent={remaining <= 5 * 60_000}>
      <span>Time remaining</span>
      <strong>{formatRemaining(remaining)}</strong>
    </div>
  );
}
