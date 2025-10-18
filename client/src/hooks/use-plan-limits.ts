import { useAuth } from "@/lib/auth";
import { PLANS } from "@shared/schema";

export function usePlanLimits() {
  const { user } = useAuth();
  
  if (!user) {
    return {
      canSwitchSports: false,
      maxClips: 0,
      maxHotkeysHome: 0,
      maxHotkeysAway: 0,
      allowedScoreButtons: [] as number[],
      canExport: false,
      exportType: false as false | "basic" | "full",
      planName: "None",
      currentPlan: "demo",
    };
  }

  const plan = PLANS[user.plan as keyof typeof PLANS];
  
  return {
    canSwitchSports: plan.sports === "all",
    maxClips: plan.clipsTotal,
    maxHotkeysHome: plan.hotkeys.home,
    maxHotkeysAway: plan.hotkeys.away,
    allowedScoreButtons: plan.hotkeys.points as unknown as number[],
    canExport: plan.export !== false,
    exportType: plan.export,
    planName: plan.name,
    currentPlan: user.plan,
  };
}
