import Link from "next/link";
import { Clock3 } from "lucide-react";
import { Brand } from "@/components/brand";

export default function AccessPendingPage() {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-full max-w-lg">
        <Brand />
        <div className="card mt-6 p-8 text-center">
          <Clock3 className="mx-auto text-[#d71920]" size={40} />
          <h1 className="mt-5 text-2xl font-black">Access is not active yet</h1>
          <p className="mt-3 leading-7 text-[#68707d]">
            Your account exists, but it has not been assigned an active Petra
            Academy role. Ask the school owner or administrator to activate it.
          </p>
          <Link className="button button-secondary mt-6" href="/login">
            Return to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
