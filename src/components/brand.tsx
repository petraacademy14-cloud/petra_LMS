import Image from "next/image";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Image
        className="size-11 shrink-0 rounded-xl border border-[#e4e6ea] bg-white object-contain shadow-sm"
        src="/petra-academy-logo.jpg"
        alt="Petra Academy official logo"
        width={44}
        height={44}
        priority
      />
      {!compact && (
        <span>
          <strong className="block text-[0.98rem] leading-tight tracking-[-0.02em]">
            Petra LMS
          </strong>
          <small className="block text-[0.67rem] font-bold uppercase tracking-[0.1em] text-[#8a929f]">
            Awka &amp; Nnewi
          </small>
        </span>
      )}
    </div>
  );
}
