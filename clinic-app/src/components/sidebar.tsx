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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minPermission?: number; // max permissionLevel allowed (lower = more access)
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/visits", label: "Visits", icon: Stethoscope },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/doctors", label: "Doctors", icon: UserCog, minPermission: 1 },
  { href: "/reports", label: "Reports", icon: BarChart3, minPermission: 2 },
  { href: "/settings", label: "Settings", icon: Settings, minPermission: 1 },
];

function NavItems({
  collapsed,
  onNavigate,
  permissionLevel,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  permissionLevel: number;
}) {
  const pathname = usePathname();
  const filtered = navItems.filter(
    (item) => !item.minPermission || permissionLevel <= item.minPermission
  );

  return (
    <nav className="flex flex-col gap-1 p-2">
      {filtered.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0_var(--color-primary)]"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);
  const { doctor } = useAuth();

  return (
    <>
      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden fixed top-3 left-3 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-14 items-center border-b px-4">
            <h2 className="text-lg font-semibold">SDH Clinic</h2>
          </div>
          <NavItems collapsed={false} permissionLevel={doctor.permissionLevel} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300 h-screen sticky top-0",
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          {!collapsed && (
            <h2 className="text-lg font-semibold truncate">SDH Clinic</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              localStorage.setItem("sidebar-collapsed", String(next));
            }}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <NavItems collapsed={collapsed} permissionLevel={doctor.permissionLevel} />
      </aside>
    </>
  );
}
