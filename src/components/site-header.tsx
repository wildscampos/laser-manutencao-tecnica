"use client";

import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const navigationItems = [
  { href: "#servicos", label: "Serviços" },
  { href: "#importancia", label: "Manutenção" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#precos", label: "Preços" },
  { href: "#agendamento", label: "Agendamento" },
  { href: "#faq", label: "FAQ" },
  { href: "#contato", label: "Contato" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  function closeMenu() {
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;

    function handleOutsidePointer(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handleOutsidePointer);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handleOutsidePointer);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#111111]/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8" aria-label="Navegação principal">
        <a className="flex min-h-11 min-w-0 items-center gap-3 font-mono text-sm font-bold uppercase tracking-[0.16em] text-white" href="#" onClick={closeMenu}>
          <Image
            className="header-logo"
            src="/logo-laserfix.jpg"
            alt=""
            width={1280}
            height={720}
            priority
          />
          <span className="truncate">LaserFix</span>
        </a>

        <div className="desktop-nav hidden items-center gap-6 text-sm text-slate-300 lg:flex">
          {navigationItems
            .filter((item) => item.href !== "#beneficios")
            .map((item) => (
              <a href={item.href} key={item.href}>
                {item.label}
              </a>
            ))}
        </div>

        <a className="hidden min-h-11 items-center rounded-[4px] border border-[#00A8FF]/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#00A8FF] hover:text-slate-950 sm:inline-flex" href="#agendamento">
          Agendar
        </a>

        <button
          aria-controls="mobile-menu"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          className="mobile-menu-button lg:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </nav>

      <div className={menuOpen ? "mobile-menu mobile-menu-open" : "mobile-menu"} id="mobile-menu">
        <div className="mx-auto grid max-w-7xl gap-2 px-5 pb-5 sm:px-8">
          {navigationItems.map((item) => (
            <a href={item.href} key={item.href} onClick={closeMenu}>
              {item.label}
            </a>
          ))}
          <a className="mobile-menu-cta" href="#agendamento" onClick={closeMenu}>
            Agendar Manutenção
          </a>
        </div>
      </div>
    </header>
  );
}
