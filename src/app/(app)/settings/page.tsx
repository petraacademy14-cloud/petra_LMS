import type { Metadata } from "next";
import {
  CheckCircle2,
  CloudCog,
  DatabaseBackup,
  FileWarning,
  LockKeyhole,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requirePermission } from "@/lib/dal";

export const metadata: Metadata = {
  title: "System settings",
};

const safeguards = [
  {
    title: "Authentication",
    detail: "Database sessions, secure cookies and 10-character minimum passwords",
    icon: LockKeyhole,
  },
  {
    title: "Structured error logs",
    detail: "Fingerprint, severity, route and deployment metadata",
    icon: FileWarning,
  },
  {
    title: "Database backups",
    detail: "Daily managed backups with a documented restore drill",
    icon: DatabaseBackup,
  },
  {
    title: "Isolated environments",
    detail: "Separate local, preview and production databases",
    icon: CloudCog,
  },
];

export default async function SettingsPage() {
  await requirePermission("system.manage");

  return (
    <div>
      <PageHeading
        description="Owner-only controls and operational safeguards. Secrets, database credentials and deployment variables are managed outside the application."
        eyebrow="Owner controls"
        title="System readiness"
      />

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        {safeguards.map((item) => {
          const Icon = item.icon;
          return (
            <article className="card flex gap-4 p-5" key={item.title}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fff0f1] text-[#bd1218]">
                <Icon size={21} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black">{item.title}</h2>
                  <CheckCircle2 size={16} className="text-[#14804a]" />
                </div>
                <p className="mt-1 text-sm leading-6 text-[#68707d]">
                  {item.detail}
                </p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="card mt-5 p-5 sm:p-6">
        <p className="eyebrow">Deployment rule</p>
        <h2 className="mt-1 text-xl font-black">
          Preview is for testing; production is for approved releases.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#68707d]">
          Every feature branch receives a Vercel preview. Preview uses its own
          database and test accounts. Production migrations run before traffic
          reaches a release, and a restore point is confirmed before any
          high-risk schema change.
        </p>
      </section>
    </div>
  );
}
