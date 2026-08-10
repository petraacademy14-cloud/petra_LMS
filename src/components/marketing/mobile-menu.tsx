"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type MobileMenuProps = {
  links: ReadonlyArray<readonly [label: string, href: string]>;
};

export function MobileMenu({ links }: MobileMenuProps) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsidePress(event: Event) {
      const menu = menuRef.current;

      if (menu?.open && !menu.contains(event.target as Node)) {
        menu.open = false;
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menuRef.current?.open) {
        menuRef.current.open = false;
        menuRef.current.querySelector("summary")?.focus();
      }
    }

    document.addEventListener("touchstart", closeOnOutsidePress, { capture: true, passive: true });
    document.addEventListener("click", closeOnOutsidePress, true);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("touchstart", closeOnOutsidePress, true);
      document.removeEventListener("click", closeOnOutsidePress, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function closeMenu() {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  }

  return (
    <details className="mobile-menu" ref={menuRef}>
      <summary aria-label="Open navigation menu">Menu</summary>
      <nav aria-label="Mobile navigation">
        {links.map(([label, href]) => (
          <Link key={href} href={href} onClick={closeMenu}>{label}</Link>
        ))}
        <Link href="/book-visit" onClick={closeMenu}>Book a visit</Link>
        <Link href="/login" onClick={closeMenu}>Login</Link>
      </nav>
    </details>
  );
}
