"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/components/ui/cn";

interface AdminTopBarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminTopBar({ title, subtitle, actions }: AdminTopBarProps) {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = session?.user.displayName
    ? session.user.displayName
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "??";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {session?.user.displayName ?? "…"}
              </p>
              <p className="text-[11px] text-gray-400 leading-none mt-0.5">
                {session?.user.role?.replace("_", " ")}
              </p>
            </div>
            <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {menuOpen && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className={cn(
                "absolute right-0 top-full z-20 mt-1 w-52 rounded-lg border border-gray-100 bg-white py-1 shadow-lg",
              )}>
                <div className="border-b border-gray-100 px-4 py-2">
                  <p className="text-sm font-medium text-gray-900">{session?.user.displayName}</p>
                  <p className="text-xs text-gray-400">{session?.user.email}</p>
                </div>
                <button
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-1.048a.75.75 0 10-1.06-1.06l-2.25 2.25a.75.75 0 000 1.06l2.25 2.25a.75.75 0 101.06-1.06L8.704 10.75H18.25A.75.75 0 0019 10z" clipRule="evenodd" />
                  </svg>
                  Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
