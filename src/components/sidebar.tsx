"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  PiggyBank,
  Target,
  TrendingUp,
  LogOut,
  MessageSquare,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/transazioni", icon: ArrowLeftRight, label: "Transazioni" },
  { href: "/conti", icon: Wallet, label: "Conti" },
  { href: "/categorie", icon: Tag, label: "Categorie" },
  { href: "/budget", icon: PiggyBank, label: "Budget" },
  { href: "/obiettivi", icon: Target, label: "Obiettivi" },
  { href: "/patrimonio", icon: TrendingUp, label: "Patrimonio" },
  { href: "/chat", icon: MessageSquare, label: "Chat AI" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-sidebar border-r border-sidebar-border px-3 py-6 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-sm font-bold text-primary-foreground">F</span>
        </div>
        <div>
          <p className="font-bold text-foreground text-sm leading-none">Finny</p>
          <p className="text-xs text-muted-foreground mt-0.5">Finance assistant</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <Button
        variant="ghost"
        size="sm"
        className="justify-start gap-3 text-muted-foreground hover:text-foreground mt-2"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut size={16} />
        Esci
      </Button>
    </aside>
  );
}
