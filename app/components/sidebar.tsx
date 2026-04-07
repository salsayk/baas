"use client";

import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, createContext, useContext } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useTranslations } from "@/app/context/TranslationContext";
import { ThemeSelector } from "@/app/components/ThemeSelector";

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
  hidden?: boolean;
}

// Sidebar navigation items (hidden items still exist but are not rendered)
const navItems: NavItem[] = [
  { name: "Overview", icon: "home", href: "/dashboards", hidden: true },
  { name: "Accounts", icon: "users", href: "/accounts" },
  { name: "Service Offices", icon: "building", href: "/service-offices" },
  { name: "Customers", icon: "users", href: "/customers" },
  { name: "Subcontractors", icon: "users", href: "/subcontractors" },
  { name: "Service Office Users", icon: "users", href: "/service-office-users" },
  { name: "Projects", icon: "award", href: "/projects" },
  { name: "Contracts", icon: "file-text", href: "/contracts" },
  { name: "Subscriptions offers", icon: "layers", href: "/subscriptions-offers" },
  { name: "User contract fee", icon: "credit-card", href: "/user-contract-fee" },
  { name: "System Lookups", icon: "list", href: "/system-lookups" },
  { name: "Languages", icon: "globe", href: "/languages" },
  { name: "Language Labels", icon: "file-text", href: "/language-labels" },
  { name: "Screens", icon: "layout", href: "/screens" },
  { name: "API Playground", icon: "code", href: "/playground", hidden: true },
  { name: "Use Cases", icon: "sparkles", href: "/use-cases", hidden: true },
  { name: "Billing", icon: "credit-card", href: "/billing", hidden: true },
  { name: "Documentation", icon: "file-text", href: "https://docs.example.com", external: true, hidden: true },
  { name: "Timese MCP", icon: "plug", href: "https://mcp.example.com", external: true, hidden: true },
];

// Icon components
function NavIcon({ name, isActive }: { name: string; isActive?: boolean }) {
  const className = isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500";
  
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
    users: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    building: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
        <path d="M9 22v-4h6v4"/>
        <path d="M8 6h.01"/>
        <path d="M16 6h.01"/>
        <path d="M12 6h.01"/>
        <path d="M12 10h.01"/>
        <path d="M12 14h.01"/>
        <path d="M16 10h.01"/>
        <path d="M16 14h.01"/>
        <path d="M8 10h.01"/>
        <path d="M8 14h.01"/>
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
    list: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M8 6h13"/>
        <path d="M8 12h13"/>
        <path d="M8 18h13"/>
        <path d="M3 6h.01"/>
        <path d="M3 12h.01"/>
        <path d="M3 18h.01"/>
      </svg>
    ),
    globe: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
        <path d="M2 12h20"/>
      </svg>
    ),
    layout: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="7" height="9" x="3" y="3" rx="1"/>
        <rect width="7" height="5" x="14" y="3" rx="1"/>
        <rect width="7" height="9" x="14" y="12" rx="1"/>
        <rect width="7" height="5" x="3" y="16" rx="1"/>
      </svg>
    ),
    layers: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </svg>
    ),
  };
  
  return icons[name] || null;
}

// External link icon
function ExternalLinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ms-auto text-slate-400 dark:text-slate-500">
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
      <span className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
        Timese
      </span>
    </Link>
  );
}

// Language selector - uses LanguageContext and reads from database
function LanguageSelector() {
  const { languageId, languages, setLanguageId, mounted } = useLanguage();

  // Show a placeholder that matches server render during hydration
  if (!mounted) {
    return (
      <div className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-sm text-slate-400 dark:text-slate-500 h-[42px]">
        Loading...
      </div>
    );
  }

  return (
    <select
      value={languageId}
      onChange={(e) => setLanguageId(parseInt(e.target.value, 10))}
      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
      aria-label="Language"
    >
      {languages.map((lang) => (
        <option key={lang.id} value={lang.id}>
          {lang.language_name}
        </option>
      ))}
    </select>
  );
}

// Workspace selector component
function WorkspaceSelector() {
  return (
    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r rtl:bg-gradient-to-l from-violet-50 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/50 border border-violet-100 dark:border-violet-800 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
        P
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Personal</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ms-auto text-slate-400 dark:text-slate-500">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>
  );
}

// Navigation item component
function NavItemLink({ item, isActive, onClick }: { item: NavItem; isActive: boolean; onClick?: () => void }) {
  const { t } = useTranslations();
  const linkClass = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
    isActive
      ? "bg-gradient-to-r rtl:bg-gradient-to-l from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
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
      {t(item.name)}
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
        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
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
      {/* Logo, language and theme */}
      <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-700">
        <Logo />
        <div className="mt-3">
          <LanguageSelector />
          <ThemeSelector />
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="px-3 lg:px-4 py-3">
        <WorkspaceSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 lg:px-4 py-2 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.filter((item) => !item.hidden).map((item) => {
            const isOnDashboards = pathname === "/dashboards";
            // `Overview` (dashboards) is hidden from the sidebar, but we still want a default
            // selection so the UI doesn't feel like nothing is selected.
            const isActive =
              item.external
                ? false
                : pathname === item.href || (isOnDashboards && item.href === "/accounts");
            return (
              <li key={item.name}>
                <NavItemLink item={item} isActive={isActive} onClick={onNavClick} />
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - User Profile */}
      <div className="p-3 lg:p-4 border-t border-slate-100 dark:border-slate-700">
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
      className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check RTL from document direction (set by LanguageContext)
  const [isRtl, setIsRtl] = useState(false);
  
  useEffect(() => {
    if (!mounted) return;
    
    // Initial check
    setIsRtl(document.documentElement.dir === "rtl");
    
    // Watch for changes to the dir attribute
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "dir") {
          setIsRtl(document.documentElement.dir === "rtl");
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <>
      {/* Mobile Overlay & Sidebar - rendered via portal with solid background */}
      {mounted &&
        createPortal(
          <>
            {isOpen && (
              <div
                className="fixed inset-0 z-[100] lg:hidden"
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                onClick={close}
                aria-hidden="true"
              />
            )}
            <aside
              className={`fixed top-0 h-full w-72 flex flex-col z-[101] lg:hidden transform transition-transform duration-300 ease-in-out shadow-xl bg-white dark:bg-slate-900 ${
                isRtl ? "right-0 border-l border-slate-200 dark:border-slate-700" : "left-0 border-r border-slate-200 dark:border-slate-700"
              } ${
                isOpen
                  ? "translate-x-0"
                  : isRtl
                  ? "translate-x-full"
                  : "-translate-x-full"
              }`}
            >
              <SidebarContent onNavClick={close} />
            </aside>
          </>,
          document.body
        )}

      {/* Desktop Sidebar */}
      <aside
        className={`app-sidebar-desktop hidden lg:flex w-64 bg-white dark:bg-slate-900 flex-col min-h-screen sticky top-0 border-r border-slate-200 dark:border-slate-700 ${
          isRtl ? "lg:order-last" : "lg:order-first"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}

export default Sidebar;
