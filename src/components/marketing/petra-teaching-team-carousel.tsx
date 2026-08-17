"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const photos = [
  {
    src: "/images/petra-staff-team.webp",
    alt: "Petra Academy staff members gathered together outside the school building",
  },
  {
    src: "/images/petra-staff-courtyard.webp",
    alt: "Petra Academy staff members gathered together in the school courtyard",
  },
] as const;

export function PetraTeachingTeamCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStartX = useRef<number | null>(null);

  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % photos.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [paused]);

  const showPrevious = () => setActiveIndex((current) => (current - 1 + photos.length) % photos.length);
  const showNext = () => setActiveIndex((current) => (current + 1) % photos.length);

  return (
    <div
      className="overflow-hidden rounded-[2rem] border border-[#e7e3e3] bg-white shadow-[0_20px_60px_rgba(51,24,24,0.08)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
      onPointerDown={(event) => {
        pointerStartX.current = event.clientX;
        setPaused(true);
      }}
      onPointerUp={(event) => {
        if (pointerStartX.current !== null) {
          const distance = event.clientX - pointerStartX.current;
          if (Math.abs(distance) > 45) {
            if (distance > 0) showPrevious();
            else showNext();
          }
        }
        pointerStartX.current = null;
        setPaused(false);
      }}
      onPointerCancel={() => {
        pointerStartX.current = null;
        setPaused(false);
      }}
      aria-roledescription="carousel"
      aria-label="Petra Academy teaching team photographs"
    >
      <div className="relative min-h-[18rem] touch-pan-y overflow-hidden bg-[#241b1b] lg:min-h-[27rem]">
        {photos.map((photo, index) => (
          <div
            className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
              index === activeIndex ? "z-10 opacity-100" : "pointer-events-none opacity-0"
            }`}
            key={photo.src}
            aria-hidden={index !== activeIndex}
          >
            <Image
              className="absolute inset-0 size-full scale-110 object-cover opacity-45 blur-2xl"
              src={photo.src}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
              aria-hidden="true"
            />
            <Image
              className="object-contain"
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 46vw"
            />
          </div>
        ))}

        <button
          className="absolute left-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white shadow-lg transition hover:bg-[#8f0b0f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          type="button"
          onClick={showPrevious}
          aria-label="Show previous teaching team photo"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <button
          className="absolute right-4 top-1/2 z-20 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white shadow-lg transition hover:bg-[#8f0b0f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          type="button"
          onClick={showNext}
          aria-label="Show next teaching team photo"
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>
      </div>

      <div className="px-6 py-5 text-center sm:px-8 sm:py-6">
        <strong className="block font-[var(--font-merriweather)] text-2xl text-[#211f20]">The Petra teaching team</strong>
        <small className="mt-2 block font-semibold tracking-wide text-[#666b73]">Caring · Dedicated · Professional</small>
        <div className="mt-4 flex justify-center gap-2" aria-label="Choose a teaching team photo">
          {photos.map((photo, index) => (
            <button
              className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-[#9b1116]" : "w-2.5 bg-[#cfc6c6] hover:bg-[#9b1116]/60"}`}
              key={photo.src}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show teaching team photo ${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
