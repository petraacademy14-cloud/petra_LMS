import { GraduationCap } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d71920] text-white shadow-sm">
        <GraduationCap size={22} strokeWidth={2.4} />
      </span>
      {!compact && (
        <span>
          <strong className="block text-[0.98rem] leading-tight tracking-[-0.02em]">
            Petra LMS
          </strong>
          <small className="block text-[0.67rem] font-bold uppercase tracking-[0.12em] text-[#8a929f]">
            School operations
          </small>
        </span>
      )}
    </div>
  );
}
