import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LogOut,
  Package,
  HelpCircle,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Questions", href: "/questions", icon: HelpCircle },
  { name: "Packages", href: "/packages", icon: Package },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useUser();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const NavContent = () => (
    <>
      <div className="space-y-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Quiz Admin
          </h2>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setOpen(false)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-auto p-4">
        <div className="flex items-center gap-2 px-2">
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {user?.role}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden border-r bg-sidebar text-sidebar-foreground lg:flex lg:w-60 lg:flex-col">
        <div className="flex h-full flex-col">
          <NavContent />
        </div>
      </div>

      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="lg:hidden fixed left-4 top-4 z-40"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 bg-sidebar p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto bg-background">
        <div className="container mx-auto p-6 pt-16 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
