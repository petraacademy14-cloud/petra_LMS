"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-[#f6f7f9] p-5">
          <div className="card max-w-lg p-8 text-center">
            <TriangleAlert className="mx-auto text-[#d71920]" size={42} />
            <h1 className="mt-5 text-2xl font-black">
              Something needs attention
            </h1>
            <p className="mt-3 leading-7 text-[#68707d]">
              The error has been recorded. Try again, and contact the system
              owner if the problem continues.
            </p>
            <button className="button mt-6" onClick={() => unstable_retry()}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
