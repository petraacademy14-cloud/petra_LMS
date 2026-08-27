"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    const form = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(form.get("email")).trim().toLowerCase(),
      password: String(form.get("password")),
      rememberMe: true,
    });

    setPending(false);

    if (result.error) {
      setError("We could not sign you in. Check your email and password.");
      return;
    }

    router.replace("/auth/route");
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={onSubmit}>
      <div>
        <label className="mb-2 block text-sm font-extrabold" htmlFor="email">
          Email address
        </label>
        <div className="relative">
          <Mail
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c939e]"
            size={18}
          />
          <input
            autoComplete="email"
            className="h-12 w-full rounded-xl border border-[#dfe2e6] bg-white pl-11 pr-3 outline-none transition focus:border-[#d71920]"
            id="email"
            name="email"
            placeholder="you@petraacademy.com"
            required
            type="email"
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-4">
          <label className="text-sm font-extrabold" htmlFor="password">
            Password
          </label>
          <span className="text-xs font-bold text-[#8b929d]">
            Minimum 10 characters
          </span>
        </div>
        <div className="relative">
          <LockKeyhole
            aria-hidden
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c939e]"
            size={18}
          />
          <input
            autoComplete="current-password"
            className="h-12 w-full rounded-xl border border-[#dfe2e6] bg-white pl-11 pr-12 outline-none transition focus:border-[#d71920]"
            id="password"
            minLength={10}
            name="password"
            required
            type={showPassword ? "text" : "password"}
          />
          <button
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#747c87] hover:bg-[#f3f4f5]"
            onClick={() => setShowPassword((value) => !value)}
            type="button"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {error && (
        <p
          aria-live="polite"
          className="rounded-xl border border-[#f2b8bc] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#a20e14]"
        >
          {error}
        </p>
      )}

      <button className="button w-full" disabled={pending} type="submit">
        {pending && <LoaderCircle className="animate-spin" size={18} />}
        {pending ? "Signing in…" : "Sign in securely"}
      </button>
    </form>
  );
}
