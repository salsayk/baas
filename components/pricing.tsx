"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Check } from "lucide-react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for getting started",
    features: [
      "Up to 5 repository analyses per month",
      "Basic summary and insights",
      "Star tracking",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: "$19",
    description: "For serious developers",
    features: [
      "Unlimited repository analyses",
      "Advanced analytics and insights",
      "PR monitoring and alerts",
      "Version update notifications",
      "Priority support",
      "Export reports",
    ],
    cta: "Start Pro Trial",
    popular: true,
    comingSoon: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For teams and organizations",
    features: [
      "Everything in Pro",
      "Team collaboration",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
      "On-premise deployment",
    ],
    cta: "Contact Sales",
    popular: false,
    comingSoon: true,
  },
]

export function Pricing() {
  const { data: session } = useSession()
  const router = useRouter()

  const handlePlanClick = (planName: string) => {
    if (planName === "Enterprise") {
      // For enterprise, open email client
      window.location.href = "mailto:sales@dandi.dev"
      return
    }
    
    if (session) {
      router.push("/dashboards")
    } else {
      signIn("google", { callbackUrl: "/dashboards" })
    }
  }

  return (
    <section id="pricing" className="py-20 sm:py-32 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-balance">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">
            Choose the plan that fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch mt-4">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative flex flex-col ${plan.popular ? "border-primary border-2 shadow-lg shadow-primary/20" : "border-border"}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-primary text-primary-foreground text-sm font-semibold px-4 py-1 rounded-full whitespace-nowrap">
                    Most Popular
                  </span>
                </div>
              )}
              {plan.comingSoon && (
                <div className="absolute top-3 right-3">
                  <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200">
                    Coming Soon
                  </span>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button 
                  className="w-full" 
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handlePlanClick(plan.name)}
                  disabled={plan.comingSoon}
                >
                  {plan.comingSoon ? "Coming Soon" : (session && plan.name !== "Enterprise" ? "Go to Dashboard" : plan.cta)}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
