import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles } from "lucide-react";
import { PLANS } from "@shared/schema";
import { useState } from "react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: string;
  featureName?: string;
}

export function UpgradeModal({ open, onClose, currentPlan, featureName }: UpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const planDetails = {
    demo: {
      features: ["1 sport only", "1 video clip total", "2 hotkeys per team", "Points +2/+3 only", "No export"],
    },
    studioMonthly: {
      features: ["1 sport only", "2 video clips (1H, 1A)", "5 hotkeys per team", "All scoring buttons", "Basic export"],
    },
    plusMonthly: {
      features: ["All 3 sports", "10 video clips", "10 hotkeys per team", "All scoring buttons", "Full export (JSON, CSV)"],
    },
    creatorYearly: {
      features: ["All 3 sports", "10 video clips", "10 hotkeys per team", "All scoring buttons", "Full export (JSON, CSV)", "Save $281/year"],
    },
    proOneTime: {
      features: ["All 3 sports", "10 video clips", "10 hotkeys per team", "All scoring buttons", "Full export (JSON, CSV)", "Lifetime access"],
    },
  };

  const handleUpgrade = async (planId: string) => {
    setSelectedPlan(planId);
    // PayPal integration will be triggered here
    try {
      const response = await fetch("/paypal/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ planId }),
      });
      
      if (!response.ok) throw new Error("Failed to create order");
      
      const data = await response.json();
      
      // Redirect to PayPal for payment
      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      }
    } catch (error) {
      console.error("Upgrade failed:", error);
      setSelectedPlan(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-primary" />
            Upgrade SportSight
          </DialogTitle>
          <DialogDescription>
            {featureName
              ? `Unlock "${featureName}" and more premium features`
              : "Choose the plan that fits your needs"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Object.entries(PLANS).map(([planId, plan]) => {
            if (planId === "demo") return null; // Don't show free plan in upgrade modal
            
            const isCurrentPlan = planId === currentPlan;
            const details = planDetails[planId as keyof typeof planDetails];
            const isPopular = planId === "plusMonthly";

            return (
              <Card
                key={planId}
                className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}
                data-testid={`card-plan-${planId}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-foreground">
                      ${plan.price}
                    </span>
                    {planId.includes("Monthly") && <span className="text-sm">/month</span>}
                    {planId.includes("Yearly") && <span className="text-sm">/year</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {details.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  {isCurrentPlan ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={isPopular ? "default" : "outline"}
                      onClick={() => handleUpgrade(planId)}
                      disabled={selectedPlan !== null}
                      data-testid={`button-upgrade-${planId}`}
                    >
                      {selectedPlan === planId ? "Processing..." : "Upgrade Now"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>Secure payment via PayPal • Cancel anytime • 30-day money-back guarantee</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
