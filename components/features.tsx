import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, Star, Lightbulb, GitPullRequest, Package, TrendingUp } from "lucide-react"

const features = [
  {
    icon: BarChart3,
    title: "Comprehensive Summaries",
    description:
      "Get detailed overviews of any repository including activity trends, contributor insights, and code quality metrics.",
  },
  {
    icon: Star,
    title: "Stars Tracking",
    description: "Monitor star growth over time with beautiful visualizations and understand what drives popularity.",
  },
  {
    icon: Lightbulb,
    title: "Cool Facts & Insights",
    description: "Discover interesting patterns, unique contributors, and hidden gems within repository data.",
  },
  {
    icon: GitPullRequest,
    title: "Important PRs",
    description: "Stay informed about critical pull requests, major refactors, and significant code changes.",
  },
  {
    icon: Package,
    title: "Version Updates",
    description: "Track releases, breaking changes, and version history to keep your dependencies up to date.",
  },
  {
    icon: TrendingUp,
    title: "Growth Analytics",
    description: "Analyze repository growth patterns, community engagement, and project health indicators.",
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
            Everything you need to analyze repositories
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Powerful features designed for developers who want deep insights into open source projects.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex items-center justify-center rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
