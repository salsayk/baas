"use client"

import Link from "next/link"
import Image from "next/image"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { GithubIcon, Menu, X } from "lucide-react"
import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"

export function Header() {
  const { data: session, status } = useSession()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [mobileMenuOpen])

  const handleSignIn = () => {
    setMobileMenuOpen(false)
    signIn("google", { callbackUrl: "/dashboards" })
  }

  const handleSignOut = () => {
    setMobileMenuOpen(false)
    signOut({ callbackUrl: "/" })
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <GithubIcon className="h-6 w-6 text-primary" />
            <span className="text-lg sm:text-xl font-bold text-balance"> BAAS - Bill Management for SMBs</span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </nav>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!mounted || status === "loading" ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-16 bg-muted animate-pulse rounded-md" />
                <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
              </div>
            ) : session ? (
              <div className="flex items-center gap-3">
                <Link href="/dashboards">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <div className="flex items-center gap-2">
                  {session.user?.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "Profile"}
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  )}
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={handleSignIn}>
                  Login
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={handleSignIn}>
                  Sign Up
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu - rendered via portal with solid background for readability */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            {/* Overlay */}
            {mobileMenuOpen && (
              <div
                className="fixed inset-0 z-[100] md:hidden"
                style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
                onClick={closeMobileMenu}
                aria-hidden="true"
              />
            )}

            {/* Menu panel - solid opaque background */}
            <div
              className={`fixed top-16 left-0 right-0 bottom-0 z-[101] md:hidden transform transition-transform duration-300 ease-in-out ${
                mobileMenuOpen ? "translate-x-0" : "translate-x-full"
              }`}
              style={{ backgroundColor: "#ffffff" }}
            >
              <nav className="flex flex-col p-6 space-y-6">
          {/* Navigation Links - solid bg for readability */}
          <div className="flex flex-col gap-2">
            <Link
              href="#features"
              onClick={closeMobileMenu}
              className="block text-lg font-medium py-3 px-4 rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-200 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={closeMobileMenu}
              className="block text-lg font-medium py-3 px-4 rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-200 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              onClick={closeMobileMenu}
              className="block text-lg font-medium py-3 px-4 rounded-lg bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-200 transition-colors"
            >
              Pricing
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Auth Section - solid backgrounds */}
          <div className="flex flex-col gap-3">
            {!mounted || status === "loading" ? (
              <div className="flex flex-col gap-3">
                <div className="h-12 w-full rounded-lg animate-pulse" style={{ backgroundColor: "#f1f5f9" }} />
                <div className="h-12 w-full rounded-lg animate-pulse" style={{ backgroundColor: "#f1f5f9" }} />
              </div>
            ) : session ? (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "#f1f5f9" }}>
                  {session.user?.image && (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "Profile"}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-slate-900">{session.user?.name}</p>
                    <p className="text-sm truncate text-slate-600">{session.user?.email}</p>
                  </div>
                </div>
                <Link href="/dashboards" onClick={closeMobileMenu}>
                  <Button className="w-full" size="lg">
                    Go to Dashboard
                  </Button>
                </Link>
                <Button variant="outline" size="lg" onClick={handleSignOut} className="w-full">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90" onClick={handleSignIn}>
                  Sign Up
                </Button>
                <Button variant="outline" size="lg" onClick={handleSignIn} className="w-full">
                  Login
                </Button>
              </>
            )}
          </div>
              </nav>
            </div>
          </>,
          document.body
        )}
    </header>
  )
}
