"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const slides = [
  {
    src: "/images/petra-love-feast.webp",
    alt: "Petra Academy students and staff celebrating their Valentine’s Day Love Feast",
    caption: "Petra Academy Valentine’s Day Love Feast",
    fit: "cover",
  },
  {
    src: "/images/petra-attentive-classroom.webp",
    alt: "Petra Academy pupils listening attentively during a classroom lesson",
    caption: "An attentive classroom where every learner is engaged",
    fit: "cover",
  },
  {
    src: "/images/petra-teacher-writing.webp",
    alt: "A Petra Academy teacher writing a classroom lesson on the whiteboard",
    caption: "Dedicated teachers building strong foundations",
    fit: "cover",
  },
  {
    src: "/images/petra-staff-team.webp",
    alt: "Petra Academy staff members gathered together outside the school building",
    caption: "The dedicated team behind every Petra Academy learner",
    fit: "cover",
  },
] as const;

export function PetraLifeSlider() {
  const [active, setActive] = useState(0);
  const show = (index: number) => setActive((index + slides.length) % slides.length);

  return (
    <div className="petra-life-slider" aria-label="Life at Petra Academy photo gallery">
      <div className="petra-life-slides" aria-live="polite">
        {slides.map((slide, index) => (
          <figure className={`petra-life-photo petra-life-photo-${slide.fit}${index === active ? " is-active" : ""}`} key={slide.src} aria-hidden={index !== active}>
            <Image
              className="petra-life-photo-foreground"
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(max-width: 720px) 100vw, 1200px"
              priority={index === 0}
            />
            <figcaption>{slide.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="petra-life-controls">
        <button type="button" onClick={() => show(active - 1)} aria-label="Show previous photo"><ChevronLeft size={21} /></button>
        <div className="petra-life-dots" aria-label="Choose a photo">
          {slides.map((slide, index) => (
            <button type="button" className={index === active ? "is-active" : ""} onClick={() => show(index)} aria-label={`Show photo ${index + 1}: ${slide.caption}`} aria-current={index === active ? "true" : undefined} key={slide.src} />
          ))}
        </div>
        <button type="button" onClick={() => show(active + 1)} aria-label="Show next photo"><ChevronRight size={21} /></button>
      </div>
    </div>
  );
}
