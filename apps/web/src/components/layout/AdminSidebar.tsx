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

// ─── Icons ────────────────────────────────────────────────────────────────────

function MapPinIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BuildingOfficeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M1 2.75A.75.75 0 011.75 2h10.5a.75.75 0 010 1.5H12v13.75a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-2.5a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75.75h-2.5a.75.75 0 010-1.5H2V3.5h-.25A.75.75 0 011 2.75zM4 5.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm.5 2.5a.5.5 0 000 1h1a.5.5 0 000-1h-1zM4 10.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zm4-5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5zM8.5 8a.5.5 0 000 1h1a.5.5 0 000-1h-1zm-.5 2.5a.5.5 0 01.5-.5h1a.5.5 0 010 1h-1a.5.5 0 01-.5-.5z"
        clipRule="evenodd"
      />
      <path d="M14.75 8.5a.75.75 0 00-.75.75V17a1 1 0 001 1h3.75a.75.75 0 000-1.5H19v-7h.25a.75.75 0 000-1.5h-4.5zm.5 9v-7h2.5v7h-2.5z" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.25 2A2.25 2.25 0 002 4.25v2.5A2.25 2.25 0 004.25 9h2.5A2.25 2.25 0 009 6.75v-2.5A2.25 2.25 0 006.75 2h-2.5zm0 9A2.25 2.25 0 002 13.25v2.5A2.25 2.25 0 004.25 18h2.5A2.25 2.25 0 009 15.75v-2.5A2.25 2.25 0 006.75 11h-2.5zm6.75-9A2.25 2.25 0 008.75 4.25v2.5A2.25 2.25 0 0011 9h2.5A2.25 2.25 0 0015.75 6.75v-2.5A2.25 2.25 0 0013.5 2h-2.5zm0 9A2.25 2.25 0 008.75 13.25v2.5A2.25 2.25 0 0011 18h2.5A2.25 2.25 0 0015.75 15.75v-2.5A2.25 2.25 0 0013.5 11h-2.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 17a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M6 3.75A2.75 2.75 0 018.75 1h2.5A2.75 2.75 0 0114 3.75v.443c.572.055 1.14.122 1.706.2C17.053 4.582 18 5.75 18 7.168v2.352a1.5 1.5 0 01-.83 1.342l-4.17 2.085a1.5 1.5 0 01-1.336-.021l-.21-.105a.5.5 0 00-.454 0l-.21.105a1.5 1.5 0 01-1.336.02L5.83 10.86A1.5 1.5 0 015 9.52V7.168c0-1.418.947-2.586 2.294-2.775A41.22 41.22 0 016 4.193V3.75zm6.5 0v.325a41.622 41.622 0 00-5 0V3.75c0-.69.56-1.25 1.25-1.25h2.5c.69 0 1.25.56 1.25 1.25z"
        clipRule="evenodd"
      />
      <path d="M5 13.174V15a2 2 0 002 2h6a2 2 0 002-2v-1.826l-1.52.76a3 3 0 01-2.674.04l-.21-.105a1 1 0 00-.904 0l-.21.106a3 3 0 01-2.674-.04L5 13.174z" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 003 0v-13A1.5 1.5 0 0015.5 2zM9.5 6A1.5 1.5 0 008 7.5v9a1.5 1.5 0 003 0v-9A1.5 1.5 0 009.5 6zM3.5 10A1.5 1.5 0 002 11.5v5a1.5 1.5 0 003 0v-5A1.5 1.5 0 003.5 10z" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078 2.749.5.5 0 01.479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.924 11.182a.53.53 0 01-.352 0C5.26 16.563 2 12.162 2 7c0-.538.035-1.069.104-1.589a.5.5 0 01.48-.425 11.947 11.947 0 007.077-2.749zm2.55 5.396a.75.75 0 00-1.06-1.061l-2.651 2.65-.905-.905a.75.75 0 10-1.06 1.06l1.435 1.436a.75.75 0 001.06 0l3.18-3.18z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ComputerDesktopIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M2 4.25A2.25 2.25 0 014.25 2h11.5A2.25 2.25 0 0118 4.25v8.5A2.25 2.25 0 0115.75 15h-3.105a3.501 3.501 0 001.1 1.677A.75.75 0 0113.26 18H6.74a.75.75 0 01-.484-1.323A3.501 3.501 0 007.355 15H4.25A2.25 2.25 0 012 12.75v-8.5zm1.5 0a.75.75 0 01.75-.75h11.5a.75.75 0 01.75.75v7.5a.75.75 0 01-.75.75H4.25a.75.75 0 01-.75-.75v-7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ClipboardDocumentListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M15.988 3.012A2.25 2.25 0 0118 5.25v6.5A2.25 2.25 0 0115.75 14H13.5v-3.379a3 3 0 00-.879-2.121l-3.12-3.121a3 3 0 00-1.402-.791V2.988a2.25 2.25 0 012.287.037l.124.082a2.25 2.25 0 001.877.319l.002-.001.02-.004a.75.75 0 01.85.47A1.5 1.5 0 0012.75 3H12a.75.75 0 010-1.5h.75a3 3 0 011.538.42l.012.006.012.007.01.005.003.002.003.001.006.004.003.001a.75.75 0 01.651-.921zm-3.876 1.498A1.5 1.5 0 0114 6.75v.019A1.5 1.5 0 0113.5 9h-9A1.5 1.5 0 013 7.5v-3A1.5 1.5 0 014.5 3h6a1.5 1.5 0 011.612 1.51zM2 11.5a.5.5 0 01.5-.5h8a.5.5 0 010 1h-8a.5.5 0 01-.5-.5zm0 2a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902A41.202 41.202 0 0114 13.6v2.838a.75.75 0 01-1.28.53l-3.434-3.434A41.319 41.319 0 013.43 13.476C1.993 13.245 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M9.493 2.852a.75.75 0 00-1.486-.204L7.545 6H4.198a.75.75 0 000 1.5h3.14l-.69 5H3.302a.75.75 0 000 1.5h3.14l-.435 3.148a.75.75 0 001.486.204L7.955 14h2.986l-.434 3.148a.75.75 0 001.486.204L12.456 14h3.346a.75.75 0 000-1.5h-3.14l.69-5h3.346a.75.75 0 000-1.5h-3.14l.435-3.148a.75.75 0 00-1.486-.204L12.045 6H9.059l.434-3.148zM8.852 7.5l-.69 5h2.986l.69-5H8.852z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4 8a6 6 0 1112 0v2.17a3 3 0 01-.879 2.12l-1.168 1.169a2.25 2.25 0 01-1.59.659H7.637a2.25 2.25 0 01-1.59-.659L4.879 12.29A3 3 0 014 10.17V8zm6 9.25a2.25 2.25 0 01-2.122-1.5h4.244A2.25 2.25 0 0110 17.25z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function DocumentTextIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
    </svg>
  );
}

function ArrowsRightLeftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M13.2 2.24a.75.75 0 00.04 1.06l2.1 1.95H6.75a.75.75 0 000 1.5h8.59l-2.1 1.95a.75.75 0 101.02 1.1l3.5-3.25a.75.75 0 000-1.1l-3.5-3.25a.75.75 0 00-1.06.04zm-6.4 8a.75.75 0 00-1.06-.04l-3.5 3.25a.75.75 0 000 1.1l3.5 3.25a.75.75 0 101.02-1.1l-2.1-1.95h8.59a.75.75 0 000-1.5H4.66l2.1-1.95a.75.75 0 00.04-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function QueueListIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v3A2.5 2.5 0 0115.5 10h-11A2.5 2.5 0 012 7.5v-3zM15.5 11.75a.75.75 0 01.75.75v3a.75.75 0 01-.75.75h-11a.75.75 0 010-1.5h10.25v-3a.75.75 0 01.75-.75zM2.75 14.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75z" />
    </svg>
  );
}

function CalendarDaysIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M5.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H6a.75.75 0 01-.75-.75V12zM6 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H6zM7.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H8a.75.75 0 01-.75-.75V12zM8 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14A.75.75 0 008 13.25H8zM9.25 10a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H10a.75.75 0 01-.75-.75V10zM10 11.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V12a.75.75 0 00-.75-.75H10zM9.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H10a.75.75 0 01-.75-.75V12zM10 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H10zM11.25 12a.75.75 0 01.75-.75h.01a.75.75 0 01.75.75v.01a.75.75 0 01-.75.75H12a.75.75 0 01-.75-.75V12zM12 13.25a.75.75 0 00-.75.75v.01c0 .414.336.75.75.75h.01a.75.75 0 00.75-.75V14a.75.75 0 00-.75-.75H12z" />
      <path
        fillRule="evenodd"
        d="M6.75 2.25A.75.75 0 017.5 3v1.5h5V3A.75.75 0 0114 3v1.5h.25A2.75 2.75 0 0117 7.25v9.5A2.75 2.75 0 0114.25 19.5H5.75A2.75 2.75 0 013 16.75v-9.5A2.75 2.75 0 015.75 4.5H6V3a.75.75 0 01.75-.75zm-1 5.5c-.69 0-1.25.56-1.25 1.25v7.5c0 .69.56 1.25 1.25 1.25h8.5c.69 0 1.25-.56 1.25-1.25v-7.5c0-.69-.56-1.25-1.25-1.25H5.75z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function VideoCameraIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M3.25 4A2.25 2.25 0 001 6.25v7.5A2.25 2.25 0 003.25 16h7.5A2.25 2.25 0 0013 13.75v-7.5A2.25 2.25 0 0010.75 4h-7.5zM19 4.75a.75.75 0 00-1.28-.53l-3 3a.75.75 0 00-.22.53v4.5c0 .199.079.39.22.53l3 3a.75.75 0 001.28-.53V4.75z" />
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_SECTION_MAIN: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: <ChartBarIcon /> },
];

const NAV_SECTION_GOV: NavItem[] = [
  {
    href: "/admin/provinces",
    label: "Provinces",
    icon: <MapPinIcon />,
    permission: PERMS.PROVINCE_READ,
  },
  {
    href: "/admin/ministries",
    label: "Ministères",
    icon: <BuildingOfficeIcon />,
    permission: PERMS.MINISTRY_READ,
  },
  {
    href: "/admin/departments",
    label: "Départements",
    icon: <GridIcon />,
    permission: PERMS.DEPARTMENT_READ,
  },
  {
    href: "/admin/divisions",
    label: "Divisions",
    icon: <GridIcon />,
    permission: PERMS.DIVISION_READ,
  },
];

const NAV_SECTION_HR: NavItem[] = [
  {
    href: "/admin/positions",
    label: "Postes",
    icon: <BriefcaseIcon />,
    permission: PERMS.POSITION_READ,
  },
  { href: "/admin/employees", label: "Agents", icon: <UsersIcon />, permission: PERMS.USER_READ },
  {
    href: "/admin/workforce",
    label: "Effectif",
    icon: <ChartBarIcon />,
    permission: PERMS.USER_READ,
  },
  {
    href: "/admin/org-chart",
    label: "Organigramme",
    icon: <GridIcon />,
    permission: PERMS.USER_READ,
  },
];

const NAV_SECTION_COLLAB: NavItem[] = [
  {
    href: "/admin/messages",
    label: "Messages",
    icon: <ChatBubbleIcon />,
  },
  {
    href: "/admin/channels",
    label: "Canaux",
    icon: <HashIcon />,
    permission: PERMS.CHANNEL_READ,
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: <BellIcon />,
  },
];

const NAV_SECTION_DOCS: NavItem[] = [
  {
    href: "/admin/documents",
    label: "Bibliothèque",
    icon: <DocumentTextIcon />,
    permission: PERMS.DOCUMENT_READ,
  },
  {
    href: "/admin/documents/shared-with-me",
    label: "Partagés avec moi",
    icon: <ShareIcon />,
    permission: PERMS.DOCUMENT_READ,
  },
  {
    href: "/admin/documents/templates",
    label: "Modèles",
    icon: <TemplateIcon />,
    permission: PERMS.DOCUMENT_READ,
  },
];

const NAV_SECTION_WORKFLOW: NavItem[] = [
  {
    href: "/admin/workflows",
    label: "Workflows",
    icon: <ArrowsRightLeftIcon />,
    permission: PERMS.WORKFLOW_READ,
  },
  {
    href: "/admin/approvals",
    label: "Mes approbations",
    icon: <CheckCircleIcon />,
    permission: PERMS.WORKFLOW_APPROVE,
  },
  {
    href: "/admin/workflows/templates",
    label: "Modèles",
    icon: <TemplateIcon />,
    permission: PERMS.WORKFLOW_MANAGE_TEMPLATES,
  },
  {
    href: "/admin/tasks",
    label: "Tâches",
    icon: <QueueListIcon />,
    permission: PERMS.TASK_READ,
  },
];

const NAV_SECTION_CALENDAR: NavItem[] = [
  {
    href: "/admin/calendar",
    label: "Calendrier",
    icon: <CalendarDaysIcon />,
    permission: PERMS.CALENDAR_READ,
  },
  {
    href: "/admin/meetings",
    label: "Réunions",
    icon: <VideoCameraIcon />,
    permission: PERMS.MEETING_READ,
  },
  {
    href: "/admin/meetings/new",
    label: "Planifier une réunion",
    icon: <PlusCircleIcon />,
    permission: PERMS.MEETING_CREATE,
  },
];

const NAV_SECTION_SECURITY: NavItem[] = [
  {
    href: "/admin/security",
    label: "Tableau de bord",
    icon: <ShieldCheckIcon />,
    permission: PERMS.ADMIN_VIEW_AUDIT_LOGS_ALL,
  },
  {
    href: "/admin/security/sessions",
    label: "Sessions",
    icon: <ComputerDesktopIcon />,
    permission: PERMS.ADMIN_VIEW_AUDIT_LOGS_ALL,
  },
  {
    href: "/admin/audit",
    label: "Journal d'audit",
    icon: <ClipboardDocumentListIcon />,
    permission: PERMS.ADMIN_VIEW_AUDIT_LOGS_MINISTRY,
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminSidebar({ mobileOpen = false, onMobileClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const permissions = session?.user.permissions ?? [];

  function isActive(item: NavItem): boolean {
    return item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
  }

  function filterItems(items: NavItem[]): NavItem[] {
    return items.filter((item) => !item.permission || hasPermission(permissions, item.permission));
  }

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/70 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[248px] flex-shrink-0 flex-col",
          "bg-navy-900",
          "transition-transform duration-200 ease-out",
          "lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        {/* DRC brand stripe — identity marker at top */}
        <div className="drc-stripe">
          <div className="stripe-blue" />
          <div className="stripe-gold" />
          <div className="stripe-red" />
        </div>

        {/* Brand header */}
        <div className="flex h-14 items-center gap-3 border-b border-navy-800 px-4">
          {/* Logo mark */}
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center bg-primary-600">
            <span className="text-sm font-black text-white leading-none">G</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white tracking-tight leading-none">GovSphere</p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-navy-400 leading-none">
              Administration
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-2 py-4">
          {/* Main */}
          <NavSection
            items={filterItems(NAV_SECTION_MAIN)}
            pathname={pathname}
            isActive={isActive}
          />

          {/* Structure gouvernementale */}
          <NavGroup label="Structure gouvernementale">
            <NavSection
              items={filterItems(NAV_SECTION_GOV)}
              pathname={pathname}
              isActive={isActive}
            />
          </NavGroup>

          {/* Ressources humaines */}
          <NavGroup label="Ressources humaines">
            <NavSection
              items={filterItems(NAV_SECTION_HR)}
              pathname={pathname}
              isActive={isActive}
            />
          </NavGroup>

          {/* Collaboration */}
          <NavGroup label="Collaboration">
            <NavSection
              items={filterItems(NAV_SECTION_COLLAB)}
              pathname={pathname}
              isActive={isActive}
            />
          </NavGroup>

          {/* Documents */}
          {filterItems(NAV_SECTION_DOCS).length > 0 && (
            <NavGroup label="Documents">
              <NavSection
                items={filterItems(NAV_SECTION_DOCS)}
                pathname={pathname}
                isActive={isActive}
              />
            </NavGroup>
          )}

          {/* Workflows & Approbations */}
          {filterItems(NAV_SECTION_WORKFLOW).length > 0 && (
            <NavGroup label="Workflows & Approbations">
              <NavSection
                items={filterItems(NAV_SECTION_WORKFLOW)}
                pathname={pathname}
                isActive={isActive}
              />
            </NavGroup>
          )}

          {/* Calendrier & Réunions */}
          {filterItems(NAV_SECTION_CALENDAR).length > 0 && (
            <NavGroup label="Calendrier & Réunions">
              <NavSection
                items={filterItems(NAV_SECTION_CALENDAR)}
                pathname={pathname}
                isActive={isActive}
              />
            </NavGroup>
          )}

          {/* Sécurité & Audit */}
          {filterItems(NAV_SECTION_SECURITY).length > 0 && (
            <NavGroup label="Sécurité & Audit">
              <NavSection
                items={filterItems(NAV_SECTION_SECURITY)}
                pathname={pathname}
                isActive={isActive}
              />
            </NavGroup>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-navy-800 px-4 py-3">
          <p className="text-[10px] font-medium text-navy-500 uppercase tracking-wider">
            RDC · Usage gouvernemental
          </p>
        </div>
      </aside>
    </>
  );
}

// ─── Nav helpers ──────────────────────────────────────────────────────────────

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-navy-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function NavSection({
  items,
  isActive,
}: {
  items: NavItem[];
  pathname: string;
  isActive: (item: NavItem) => boolean;
}) {
  return (
    <ul className="space-y-px">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors",
                active
                  ? // Signature element: gold authority bar + brightened text
                    "authority-bar bg-navy-800 text-white font-medium"
                  : "text-navy-300 hover:bg-navy-800/60 hover:text-navy-100 font-normal",
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0 transition-colors",
                  active ? "text-gold-400" : "text-navy-500",
                )}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
