"use client";

import { createContext, useContext, useState } from "react";

import { cn } from "./cn";

// ─── Context ──────────────────────────────────────────────────────────────────

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs sub-components must be used inside <Tabs>");
  return ctx;
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

interface TabsProps {
  defaultTab: string;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultTab, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("flex flex-col", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

// ─── TabList ──────────────────────────────────────────────────────────────────

export function TabList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex border-b border-slate-200 bg-white", className)}>
      {children}
    </div>
  );
}

// ─── Tab ─────────────────────────────────────────────────────────────────────

interface TabProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function Tab({ value, children, className }: TabProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(
        "relative px-4 py-3 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset",
        isActive
          ? "text-primary-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600"
          : "text-slate-500 hover:text-slate-700",
        className,
      )}
    >
      {children}
    </button>
  );
}

// ─── TabPanel ─────────────────────────────────────────────────────────────────

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;

  return (
    <div role="tabpanel" className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
}
