"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

import { cn } from "@/components/ui/cn";

import { useMobileSidebar } from "./MobileSidebarContext";

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminTopBar({ title, subtitle, actions }: AdminTopBarProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const { openSidebar } = useMobileSidebar();

  const initials = session?.user.displayName
    ? session.user.displayName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "??";

  const roleLabel = session?.user.role?.replace(/_/g, " ") ?? "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      {/* Left: hamburger (mobile) + title */}
      <div className="flex min-w-0 items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={openSidebar}
          className="flex h-8 w-8 items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5A.75.75 0 012 10z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="min-w-0">
          <h1 className="text-sm font-semibold tracking-tight text-slate-900 truncate">{title}</h1>
          {subtitle && (
            <p className="hidden text-[11px] text-slate-400 sm:block truncate">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: actions + user menu */}
      <div className="flex items-center gap-2">
        {actions}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-7 w-7 items-center justify-center bg-primary-600 text-[11px] font-bold text-white">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-slate-900 leading-none tracking-tight">
                {session?.user.displayName ?? "…"}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400 leading-none uppercase tracking-wider">
                {roleLabel}
              </p>
            </div>
            <svg
              className="hidden h-3.5 w-3.5 text-slate-400 sm:block"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                className={cn(
                  "absolute right-0 top-full z-20 mt-1 w-56 border border-slate-200 bg-white shadow-card-md",
                  "animate-slide-down",
                )}
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900 tracking-tight">
                    {session?.user.displayName}
                  </p>
                  <p className="text-xs text-slate-400">{session?.user.email}</p>
                  {session?.user.matriculeNumber && (
                    <p className="mt-0.5 font-mono text-xs text-slate-400">
                      {session.user.matriculeNumber}
                    </p>
                  )}
                </div>
                <div className="py-1">
                  <button
                    onClick={() => void signOut({ callbackUrl: "/login" })}
                    className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg
                      className="h-4 w-4 text-slate-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z"
                        clipRule="evenodd"
                      />
                      <path
                        fillRule="evenodd"
                        d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-1.048a.75.75 0 10-1.06-1.06l-2.25 2.25a.75.75 0 000 1.06l2.25 2.25a.75.75 0 101.06-1.06L8.704 10.75H18.25A.75.75 0 0019 10z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
