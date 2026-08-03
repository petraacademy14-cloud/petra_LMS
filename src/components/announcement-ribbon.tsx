"use client";

import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

type PublicAnnouncement = {
  id: string;
  title: string;
  body: string;
  scope: string;
};

type AnnouncementResponse = {
  announcements?: PublicAnnouncement[];
};

const REFRESH_INTERVAL = 60_000;
const ROTATION_INTERVAL = 8_000;

export function AnnouncementRibbon() {
  const [announcements, setAnnouncements] = useState<PublicAnnouncement[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      try {
        const response = await fetch("/api/public/announcements", {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!response.ok) return;

        const data = (await response.json()) as AnnouncementResponse;
        if (!cancelled) {
          setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
          setActiveIndex(0);
        }
      } catch {
        // The ribbon stays hidden if announcements cannot be loaded.
      }
    }

    void loadAnnouncements();
    const refreshTimer = window.setInterval(loadAnnouncements, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (announcements.length < 2) return;

    const rotationTimer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % announcements.length);
    }, ROTATION_INTERVAL);

    return () => window.clearInterval(rotationTimer);
  }, [announcements.length]);

  if (!announcements.length) return null;

  const announcement = announcements[activeIndex % announcements.length];

  return (
    <aside className="announcement-ribbon" aria-label="School announcements">
      <div className="announcement-ribbon-inner" role="status" aria-live="polite">
        <span className="announcement-ribbon-label">
          <Megaphone aria-hidden="true" size={16} />
          School announcement
        </span>
        <span className="announcement-ribbon-message">
          <strong>{announcement.title}</strong>
          <span>
            <em>{announcement.scope}</em>
            {announcement.body}
          </span>
        </span>
        {announcements.length > 1 ? (
          <span className="announcement-ribbon-count" aria-label={`Announcement ${activeIndex + 1} of ${announcements.length}`}>
            {activeIndex + 1}/{announcements.length}
          </span>
        ) : null}
      </div>
    </aside>
  );
}
