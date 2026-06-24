"use client";

import { useState } from "react";

import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { MobileSidebarContext } from "@/components/layout/MobileSidebarContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <MobileSidebarContext.Provider value={{ openSidebar: () => setMobileSidebarOpen(true) }}>
      <div className="flex h-full bg-[var(--surface-page)]">
        <AdminSidebar
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </MobileSidebarContext.Provider>
  );
}
