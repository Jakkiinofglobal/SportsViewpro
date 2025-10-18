import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { PLANS } from "@shared/schema";

export default function SelectSport() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = useState<string | null>(null);

  const selectSportMutation = useMutation({
    mutationFn: async (sport: string) => {
      return await apiRequest("/api/select-sport", {
        method: "POST",
        body: JSON.stringify({ sport }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/session"] });
      toast({
        title: "Sport selected!",
        description: "Let's get started with your visualizer.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Selection failed",
        description: error.message || "Could not select sport",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return null;
  }

  const plan = PLANS[user.plan as keyof typeof PLANS];
  const isOneSportPlan = plan.sports === 1;

  const sports = [
    { id: "basketball", name: "Basketball", icon: "🏀" },
    { id: "football", name: "Football", icon: "🏈" },
    { id: "baseball", name: "Baseball", icon: "⚾" },
  ];

  const handleSubmit = () => {
    if (selectedSport) {
      selectSportMutation.mutate(selectedSport);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Your Sport</CardTitle>
          <CardDescription>
            {isOneSportPlan ? (
              <span className="text-destructive font-medium">
                ⚠️ Your {plan.name} plan allows ONE sport only. Choose carefully - this cannot be changed unless you upgrade.
              </span>
            ) : (
              "Choose which sport you want to use. You can switch anytime with your plan."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {sports.map((sport) => (
              <button
                key={sport.id}
                onClick={() => setSelectedSport(sport.id)}
                className={`p-6 border-2 rounded-lg hover-elevate active-elevate-2 transition-all ${
                  selectedSport === sport.id
                    ? "border-primary bg-primary/10"
                    : "border-border"
                }`}
                data-testid={`button-sport-${sport.id}`}
              >
                <div className="text-6xl mb-2">{sport.icon}</div>
                <div className="font-medium">{sport.name}</div>
              </button>
            ))}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={!selectedSport || selectSportMutation.isPending}
            className="w-full"
            data-testid="button-confirm-sport"
          >
            {selectSportMutation.isPending ? "Saving..." : "Continue"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
