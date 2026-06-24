"use client";

import { createContext, useContext } from "react";

interface MobileSidebarContextValue {
  openSidebar: () => void;
}

export const MobileSidebarContext = createContext<MobileSidebarContextValue>({
  openSidebar: () => undefined,
});

export function useMobileSidebar(): MobileSidebarContextValue {
  return useContext(MobileSidebarContext);
}
