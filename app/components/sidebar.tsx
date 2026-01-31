"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, createContext, useContext } from "react";

// Sidebar context for mobile toggle
interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextType>({
  isOpen: false,
  toggle: () => {},
  close: () => {},
});

export const useSidebar = () => useContext(SidebarContext);

// Navigation item type
interface NavItem {
  name: string;
  icon: string;
  href: string;
  external?: boolean;
}

// Sidebar navigation items
const navItems: NavItem[] = [
  { name: "Overview", icon: "home", href: "/dashboards" },
  { name: "API Playground", icon: "code", href: "/playground" },
  { name: "Use Cases", icon: "sparkles", href: "/use-cases" },
  { name: "Billing", icon: "credit-card", href: "/billing" },
  { name: "Documentation", icon: "file-text", href: "https://docs.example.com", external: true },
  { name: "Dandi MCP", icon: "plug", href: "https://mcp.example.com", external: true },
];

// Icon components
function NavIcon({ name, isActive }: { name: string; isActive?: boolean }) {
  const className = isActive ? "text-blue-600" : "text-slate-400";
  
  const icons: Record<string, React.ReactNode> = {
    home: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    code: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    sparkles: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
      </svg>
    ),
    "credit-card": (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="20" height="14" x="2" y="5" rx="2"/>
        <line x1="2" x2="22" y1="10" y2="10"/>
      </svg>
    ),
    settings: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    award: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="8" r="6"/>
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
      </svg>
    ),
    "file-text": (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" x2="8" y1="13" y2="13"/>
        <line x1="16" x2="8" y1="17" y2="17"/>
        <line x1="10" x2="8" y1="9" y2="9"/>
      </svg>
    ),
    plug: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22v-5"/>
        <path d="M9 8V2"/>
        <path d="M15 8V2"/>
        <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>
      </svg>
    ),
  };
  
  return icons[name] || null;
}

// External link icon
function ExternalLinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-slate-400">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/>
      <line x1="10" x2="21" y1="14" y2="3"/>
    </svg>
  );
}

// Logo component
function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="m2 17 10 5 10-5"/>
          <path d="m2 12 10 5 10-5"/>
        </svg>
      </div>
      <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
        dandi
      </span>
    </Link>
  );
}

// Workspace selector component
function WorkspaceSelector() {
  return (
    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 hover:border-violet-200 transition-colors">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
        P
      </div>
      <span className="text-sm font-medium text-slate-700">Personal</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-slate-400">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>
  );
}

// Navigation item component
function NavItemLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  const linkClass = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
    isActive
      ? "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 border border-blue-100"
      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
  }`;

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
        onClick={onClick}
      >
        <NavIcon name={item.icon} isActive={isActive} />
        {item.name}
        <ExternalLinkIcon />
      </a>
    );
  }

  return (
    <Link href={item.href} className={linkClass} onClick={onClick}>
      <NavIcon name={item.icon} isActive={isActive} />
      {item.name}
    </Link>
  );
}

// User Profile component - only renders after hydration
function UserProfile() {
  const [mounted, setMounted] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  // Show loading skeleton until mounted to prevent hydration mismatch
  if (!mounted || status === "loading") {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 animate-pulse flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-1" />
          <div className="h-3 w-28 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Show placeholder if not authenticated
  if (status === "unauthenticated" || !session) {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
          <span className="text-sm font-bold text-slate-600">U</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-700 truncate">Guest</p>
          <p className="text-xs text-slate-500 truncate">Not signed in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden flex-shrink-0">
        {session?.user?.image ? (
          <Image
            src={session.user.image}
            alt={session.user.name || "Profile"}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold text-slate-600">
            {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">
          {session?.user?.name || "User"}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {session?.user?.email || "Free Plan"}
        </p>
      </div>
      <button
        onClick={handleSignOut}
        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        title="Sign out"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" x2="9" y1="12" y2="12"/>
        </svg>
      </button>
    </div>
  );
}

// Sidebar content (reusable between mobile and desktop)
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Logo */}
      <div className="p-4 lg:p-6 border-b border-slate-100">
        <Logo />
      </div>

      {/* Workspace Selector */}
      <div className="px-3 lg:px-4 py-3">
        <WorkspaceSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.external ? false : pathname === item.href;
            return (
              <li key={item.name}>
                <NavItemLink item={item} isActive={isActive} onClick={onNavClick} />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - User Profile */}
      <div className="p-3 lg:p-4 border-t border-slate-100">
        <UserProfile />
      </div>
    </>
  );
}

// Mobile menu toggle button
export function MobileMenuButton() {
  const { toggle, isOpen } = useSidebar();

  return (
    <button
      onClick={toggle}
      className="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors"
      aria-label="Toggle sidebar"
    >
      {isOpen ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" x2="6" y1="6" y2="18"/>
          <line x1="6" x2="18" y1="6" y2="18"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" x2="20" y1="12" y2="12"/>
          <line x1="4" x2="20" y1="6" y2="6"/>
          <line x1="4" x2="20" y1="18" y2="18"/>
        </svg>
      )}
    </button>
  );
}

// Sidebar Provider
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  // Close sidebar on route change
  const pathname = usePathname();
  useEffect(() => {
    close();
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  // Close on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        close();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
}

// Main Sidebar component
export function Sidebar() {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-slate-200 flex flex-col z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent onNavClick={close} />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col min-h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}

export default Sidebar;
