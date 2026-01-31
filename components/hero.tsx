"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Sparkles } from "lucide-react"
import { useSession, signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function Hero() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleGetStarted = () => {
    if (session) {
      // Already logged in, redirect to dashboard
      router.push("/dashboards")
    } else {
      // Not logged in, sign in with Google
      signIn("google", { callbackUrl: "/dashboards" })
    }
  }

  return (
    <section className="relative overflow-hidden py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-foreground">Deep insights for open source repositories</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-balance mb-6">
            Unlock the power of <span className="text-primary">GitHub analytics</span>
          </h1>

          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto mb-10 leading-relaxed">
            Get comprehensive insights, track repository growth, discover interesting facts, monitor important pull
            requests, and stay updated with the latest versions—all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground group"
              onClick={handleGetStarted}
            >
              {session ? "Go to Dashboard" : "Start Analyzing Free"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline">
                Watch Demo
              </Button>
            </Link>
          </div>

          <div className="mt-12 text-sm text-muted-foreground">
            No credit card required • Free tier available • Setup in 30 seconds
          </div>
        </div>
      </div>
    </section>
  )
}
