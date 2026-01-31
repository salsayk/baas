"use client"

import Link from "next/link"
import Image from "next/image"
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
            <span className="text-lg sm:text-xl font-bold text-balance">Dandi Github Analyzer</span>
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

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu */}
      <div
        className={`fixed top-16 left-0 right-0 bottom-0 bg-background z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <nav className="flex flex-col p-6 space-y-6">
          {/* Navigation Links */}
          <div className="flex flex-col space-y-4">
            <Link
              href="#features"
              onClick={closeMobileMenu}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              onClick={closeMobileMenu}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              onClick={closeMobileMenu}
              className="text-lg font-medium text-foreground hover:text-primary transition-colors py-2"
            >
              Pricing
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Auth Section */}
          <div className="flex flex-col space-y-4">
            {!mounted || status === "loading" ? (
              <div className="flex flex-col gap-3">
                <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
                <div className="h-12 w-full bg-muted animate-pulse rounded-lg" />
              </div>
            ) : session ? (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
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
                    <p className="font-medium truncate">{session.user?.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{session.user?.email}</p>
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
    </header>
  )
}
