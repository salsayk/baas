"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useSession, signIn } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function CTA() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleGetStarted = () => {
    if (session) {
      router.push("/dashboards")
    } else {
      signIn("google", { callbackUrl: "/dashboards" })
    }
  }

  return (
    <section className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center bg-card border border-border rounded-2xl p-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
            Ready to analyze your repositories?
          </h2>
          <p className="text-lg text-muted-foreground text-pretty mb-8">
            Join thousands of developers using Dandi to gain deeper insights into their GitHub projects.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary/90 text-primary-foreground group"
              onClick={handleGetStarted}
            >
              {session ? "Go to Dashboard" : "Get Started for Free"}
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline">
                Schedule a Demo
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
