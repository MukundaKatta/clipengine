"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Upload,
  FolderOpen,
  FileOutput,
  Mic,
  Calendar,
  LayoutTemplate,
  Settings,
  Zap,
  BarChart3,
} from "lucide-react";

const navigation = [
  { name: "Upload", href: "/upload", icon: Upload },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Outputs", href: "/outputs", icon: FileOutput },
  { name: "Brand Voice", href: "/brand-voice", icon: Mic },
  { name: "Schedule", href: "/schedule", icon: Calendar },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
];

const secondaryNavigation = [
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">ClipEngine</span>
        </div>

        {/* Main Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Secondary Navigation */}
            <li>
              <div className="text-xs font-semibold leading-6 text-muted-foreground">
                Settings
              </div>
              <ul role="list" className="-mx-2 mt-2 space-y-1">
                {secondaryNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* Credits usage */}
            <li className="mt-auto">
              <div className="rounded-lg border bg-muted/50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Credits</span>
                  <span className="text-muted-foreground">234 / 1,000</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-secondary">
                  <div className="h-full w-[23%] rounded-full bg-primary transition-all" />
                </div>
                <Link
                  href="/settings"
                  className="mt-2 block text-xs text-primary hover:underline"
                >
                  Upgrade plan
                </Link>
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
