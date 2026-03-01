"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Receipt,
  UserCog,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/format";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/app/login/logout-action";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minPermission?: number;
  exactPermission?: number;
};

type NavSection = {
  label: string;
  items: NavItem[];
  /** Show section only when this returns true */
  visible?: (level: number) => boolean;
};

const navSections: NavSection[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/patients", label: "Patients", icon: Users },
      { href: "/appointments", label: "Appointments", icon: CalendarDays },
    ],
  },
  {
    label: "Clinical",
    visible: (level) => level <= 2,
    items: [
      { href: "/visits", label: "Treatments", icon: Stethoscope, minPermission: 2 },
      { href: "/receipts", label: "Receipts", icon: Receipt, minPermission: 2 },
    ],
  },
  {
    label: "Admin",
    visible: (level) => level <= 2,
    items: [
      { href: "/doctors", label: "Doctors", icon: UserCog, minPermission: 1 },
      { href: "/reports", label: "Reports", icon: BarChart3, minPermission: 2 },
      { href: "/settings", label: "Settings", icon: Settings, minPermission: 1 },
    ],
  },
  {
    label: "Personal",
    visible: (level) => level === 3,
    items: [
      { href: "/my-activity", label: "My Activity", icon: Activity, exactPermission: 3 },
    ],
  },
];

function getRoleBadge(level: number) {
  if (level <= 1) return { label: "Admin", className: "bg-violet-100 text-violet-700" };
  if (level === 2) return { label: "Reception", className: "bg-sky-100 text-sky-700" };
  return { label: "Doctor", className: "bg-emerald-100 text-emerald-700" };
}

function NavContent({
  collapsed,
  onNavigate,
  permissionLevel,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  permissionLevel: number;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-1">
      {navSections.map((section) => {
        // Check section-level visibility
        if (section.visible && !section.visible(permissionLevel)) return null;

        // Filter items by permission
        const visibleItems = section.items.filter((item) => {
          if (item.exactPermission !== undefined)
            return permissionLevel === item.exactPermission;
          if (item.minPermission !== undefined)
            return permissionLevel <= item.minPermission;
          return true;
        });

        if (visibleItems.length === 0) return null;

        return (
          <div key={section.label} className="mt-3 first:mt-0">
            {!collapsed && (
              <span className="px-3 mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                {section.label}
              </span>
            )}
            {collapsed && <div className="my-1 mx-2 border-t border-border/50 first:hidden" />}
            <div className="flex flex-col gap-0.5">
              {visibleItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-semibold border-l-[3px] border-l-primary pl-[9px]"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground border-l-[3px] border-l-transparent pl-[9px]",
                      collapsed && "justify-center px-0 py-2"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function UserCard({ collapsed, doctor }: { collapsed: boolean; doctor: { name: string; permissionLevel: number } }) {
  const role = getRoleBadge(doctor.permissionLevel);
  const initials = doctor.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={cn("border-t px-2 py-3", collapsed ? "flex flex-col items-center gap-2" : "")}>
      {collapsed ? (
        <>
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold" title={toTitleCase(doctor.name)}>
            {initials}
          </div>
          <form action={logout}>
            <button type="submit" title="Logout" className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </>
      ) : (
        <div className="flex items-center gap-2.5 px-1">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium truncate leading-tight">{toTitleCase(doctor.name)}</p>
            <span className={cn("inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 leading-none", role.className)}>
              {role.label}
            </span>
          </div>
          <form action={logout}>
            <button type="submit" title="Logout" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);
  const { doctor } = useAuth();

  return (
    <div className="print:hidden">
      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-2.5 left-3 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col">
          <div className="flex h-12 items-center gap-2 border-b px-4">
            <span className="text-lg" aria-hidden>🦷</span>
            <span className="font-bold text-sm tracking-tight">SDH</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <NavContent
              collapsed={false}
              onNavigate={() => setMobileOpen(false)}
              permissionLevel={doctor.permissionLevel}
            />
          </div>
          <UserCard collapsed={false} doctor={doctor} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-sidebar transition-all duration-300 h-screen sticky top-0",
          collapsed ? "w-[52px]" : "w-56"
        )}
      >
        {/* Header */}
        <div className={cn("flex h-12 items-center border-b shrink-0", collapsed ? "justify-center px-1" : "justify-between px-3")}>
          {collapsed ? (
            <button
              className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              onClick={() => {
                setCollapsed(false);
                localStorage.setItem("sidebar-collapsed", "false");
              }}
              title="Expand sidebar"
            >
              <span className="text-base" aria-hidden>🦷</span>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-base" aria-hidden>🦷</span>
                <span className="font-bold text-sm tracking-tight">SDH</span>
              </div>
              <button
                className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                onClick={() => {
                  setCollapsed(true);
                  localStorage.setItem("sidebar-collapsed", "true");
                }}
                title="Collapse sidebar"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto">
          <NavContent collapsed={collapsed} permissionLevel={doctor.permissionLevel} />
        </div>

        {/* User card */}
        <UserCard collapsed={collapsed} doctor={doctor} />
      </aside>
    </div>
  );
}
