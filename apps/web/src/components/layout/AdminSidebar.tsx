"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/components/ui/cn";
import { hasPermission, PERMS } from "@/lib/permissions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  permission?: string;
}

function MapPinIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clipRule="evenodd" />
    </svg>
  );
}

function BuildingOfficeIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M1 2.75A.75.75 0 011.75 2h10.5a.75.75 0 010 1.5H12v13.75a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5H2V3.5h-.25A.75.75 0 011 2.75zM4 5.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm.5 2.5a.5.5 0 000 1h1a.5.5 0 000-1h-1zM4 10.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm4-5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM8.5 8a.5.5 0 000 1h1a.5.5 0 000-1h-1zm-.5 2.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z" clipRule="evenodd" />
      <path d="M14.75 8.5a.75.75 0 00-.75.75V17a1 1 0 001 1h3.75a.75.75 0 000-1.5H19v-7h.25a.75.75 0 000-1.5h-4.5zm.5 9v-7h2.5v7h-2.5zM16 11.25a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5a.75.75 0 01-.75-.75zm.75 1.75a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h-.5z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.168v2.352a1.5 1.5 0 01-.83 1.342l-4.17 2.085a1.5 1.5 0 01-1.336-.021l-.21-.105a.5.5 0 00-.454 0l-.21.105a1.5 1.5 0 01-1.336.02L5.83 10.86A1.5 1.5 0 015 9.52V7.168c0-1.418.947-2.586 2.294-2.775A41.22 41.22 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25zM10 10a1 1 0 00-1 1v.01a1 1 0 001 1h.01a1 1 0 001-1V11a1 1 0 00-1-1H10z" clipRule="evenodd" />
      <path d="M5 13.174V15a2 2 0 002 2h6a2 2 0 002-2v-1.826l-1.52.76a3 3 0 01-2.674.04l-.21-.105a1 1 0 00-.904 0l-.21.106a3 3 0 01-2.674-.04L5 13.174z" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 003 0v-13A1.5 1.5 0 0015.5 2zM9.5 6A1.5 1.5 0 008 7.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 009.5 6zM3.5 10A1.5 1.5 0 002 11.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 10z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.75-9A2.25 2.25 0 008.75 4.25v2.5A2.25 2.25 0 0011 9h2.5A2.25 2.25 0 0015.75 6.75v-2.5A2.25 2.25 0 0013.5 2h-2.5zm0 9A2.25 2.25 0 008.75 13.25v2.5A2.25 2.25 0 0011 18h2.5A2.25 2.25 0 0015.75 15.75v-2.5A2.25 2.25 0 0013.5 11h-2.5z" clipRule="evenodd" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: <ChartBarIcon /> },
  { href: "/admin/provinces", label: "Provinces", icon: <MapPinIcon />, permission: PERMS.PROVINCE_READ },
  { href: "/admin/ministries", label: "Ministères", icon: <BuildingOfficeIcon />, permission: PERMS.MINISTRY_READ },
  { href: "/admin/departments", label: "Départements", icon: <GridIcon />, permission: PERMS.DEPARTMENT_READ },
  { href: "/admin/divisions", label: "Divisions", icon: <GridIcon />, permission: PERMS.DIVISION_READ },
  { href: "/admin/positions", label: "Postes", icon: <BriefcaseIcon />, permission: PERMS.POSITION_READ },
  { href: "/admin/employees", label: "Agents", icon: <UsersIcon />, permission: PERMS.USER_READ },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const permissions = session?.user.permissions ?? [];

  return (
    <aside className="flex h-screen w-[260px] flex-shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <span className="text-sm font-bold text-white">G</span>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">GovSphere</p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">Administration</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            if (item.permission && !hasPermission(permissions, item.permission)) return null;

            const isActive =
              item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className={isActive ? "text-primary-600" : "text-gray-400"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* DRC flag accent bar */}
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-[#007FFF]" />
        <div className="w-6 bg-[#F7D918]" />
        <div className="flex-1 bg-[#CE1020]" />
      </div>
    </aside>
  );
}
