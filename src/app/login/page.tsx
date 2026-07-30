import type { Metadata } from "next";
import { CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[#262a31] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-40 -top-40 size-[32rem] rounded-full bg-[#d71920]/20 blur-3xl" />
        <div className="absolute -bottom-52 -left-32 size-[30rem] rounded-full bg-white/5" />

        <div className="relative">
          <Brand />
        </div>

        <div className="relative max-w-xl">
          <p className="mb-5 text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff858a]">
            Petra Academy operations
          </p>
          <h1 className="text-5xl font-black leading-[1.05] tracking-[-0.045em]">
            One clear view across Awka and Nnewi.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-[#c8ccd2]">
            A secure, simple foundation for managing campuses, staff, academic
            structures and every important change.
          </p>

          <div className="mt-9 grid gap-3 text-sm font-bold text-[#e1e3e7]">
            {[
              "Campus-aware access and records",
              "Owner, admin and teacher permissions",
              "Complete audit trail for accountability",
            ].map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <CheckCircle2 className="text-[#ff6268]" size={19} />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-5 text-xs font-bold text-[#aeb4bd]">
          <span className="flex items-center gap-2">
            <MapPin size={15} /> Awka
          </span>
          <span className="flex items-center gap-2">
            <MapPin size={15} /> Nnewi
          </span>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Brand />
          </div>
          <div className="card p-6 sm:p-9">
            <div className="flex size-11 items-center justify-center rounded-xl bg-[#fff0f1] text-[#bd1218]">
              <ShieldCheck size={23} />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-[-0.035em]">
              Welcome back
            </h2>
            <p className="mt-2 leading-7 text-[#6d7580]">
              Sign in with the account issued by your school owner or
              administrator.
            </p>
            <LoginForm />
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-[#838b96]">
            Account creation is restricted. Contact your administrator if you
            need access.
          </p>
        </div>
      </section>
    </main>
  );
}
