import { Card, CardContent } from "@/components/ui/card"
import { Search, Zap, BarChart } from "lucide-react"

const steps = [
  {
    icon: Search,
    title: "Enter Repository URL",
    description: "Simply paste any GitHub repository URL or search by name.",
    step: "01",
  },
  {
    icon: Zap,
    title: "AI-Powered Analysis",
    description: "Our intelligent system analyzes repository data in real-time.",
    step: "02",
  },
  {
    icon: BarChart,
    title: "Get Actionable Insights",
    description: "View comprehensive reports with visualizations and recommendations.",
    step: "03",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">How it works</h2>
          <p className="text-lg text-muted-foreground text-pretty">Get started in three simple steps</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
              <div key={index} className="relative">
                <Card className="bg-card border-border">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4 relative">
                      <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-4">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
                        {step.step}
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-border" />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
