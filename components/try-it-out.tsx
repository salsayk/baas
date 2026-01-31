"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2, Sparkles } from "lucide-react"

export function TryItOut() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [githubUrl, setGithubUrl] = useState("https://github.com/salsayk/udemy_dandi")
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!githubUrl.trim()) return

    // Check authentication status
    if (status === "loading") {
      // Still loading, wait a moment
      return
    }

    setIsRedirecting(true)

    if (!session) {
      // Not authenticated - redirect to sign in
      signIn("google", { callbackUrl: "/use-cases" })
      return
    }

    // Authenticated - redirect to Use Cases page
    router.push("/use-cases")
  }

  return (
    <section id="try-it-out" className="py-16 sm:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-10 sm:mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-foreground">Live Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
            Try it out
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Enter any public GitHub repository URL and see our AI-powered analysis in action.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* API Request - Left Side */}
            <div className="bg-card border border-border rounded-xl lg:rounded-2xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground ml-2">API Request</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">POST</span>
              </div>
              <div className="p-4 lg:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="demo-url" className="block text-sm font-medium text-foreground mb-2">
                      GitHub Repository URL
                    </label>
                    <input
                      id="demo-url"
                      type="url"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repository"
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Request Preview */}
                  <div className="bg-muted/30 rounded-lg p-3 lg:p-4 font-mono text-xs lg:text-sm overflow-x-auto">
                    <pre className="text-muted-foreground">
{`{
  "githubUrl": "${githubUrl || "https://github.com/owner/repo"}"
}`}
                    </pre>
                  </div>

                  <Button
                    type="submit"
                    disabled={!githubUrl.trim() || isRedirecting || status === "loading"}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group"
                  >
                    {isRedirecting || status === "loading" ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {session ? "Redirecting..." : "Signing in..."}
                      </>
                    ) : (
                      <>
                        Analyze Repository
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>
                </form>

                <p className="mt-4 text-xs text-muted-foreground text-center">
                  {session ? "Click to analyze in the Use Cases page" : "Sign in to start analyzing repositories"}
                </p>
              </div>
            </div>

            {/* API Response - Right Side */}
            <div className="bg-card border border-border rounded-xl lg:rounded-2xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground ml-2">AI Analysis</span>
                </div>
                <span className="text-xs font-mono px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  200 OK
                </span>
              </div>
              <div className="p-4 lg:p-6 h-[400px] lg:h-[450px] overflow-y-auto">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center gap-2 text-primary">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="font-semibold">AI-Generated Analysis</h3>
                  </div>

                  {/* Purpose */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Purpose
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This project is designed to generate a full application via cursor prompting, specifically as part of a Udemy course.
                    </p>
                  </div>

                  {/* Key Features */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Key Features
                    </h4>
                    <ul className="space-y-1.5">
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Bootstrapped with create-next-app</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Development server setup</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Automatic page updates on file modification</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm text-muted-foreground">
                        <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Font optimization with next/font</span>
                      </li>
                    </ul>
                  </div>

                  {/* Tech Stack */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Technology Stack
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">TypeScript</span>
                      <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">Next.js</span>
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Target Audience
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Developers looking to learn Next.js and build applications using TypeScript.
                    </p>
                  </div>

                  {/* Summary */}
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      Summary
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      The repository &apos;salsayk/udemy_dandi&apos; is a Next.js project that serves as a practical example for a Udemy course focused on application generation through cursor prompting. It provides a straightforward setup for running a development server and includes features such as automatic page updates and font optimization. The project is aimed at developers who want to enhance their skills in Next.js and TypeScript, offering resources and documentation for further learning.
                    </p>
                  </div>

                  {/* AI Badge */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3 w-3 text-primary" />
                      AI-powered analysis • Example output
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
