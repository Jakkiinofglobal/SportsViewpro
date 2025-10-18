// client/src/lib/tiers.ts

export type PlanId =
  | "demo"
  | "studioMonthly"
  | "plusMonthly"
  | "creatorYearly"
  | "proOneTime";

export type FeatureKey =
  | "multiSports"      // switch sports freely
  | "videoClips"       // can attach/play video clips
  | "saveExport"       // export/save sessions or data
  | "advancedStats"    // advanced stats/overlays
  | "hotkeysExtended"; // > baseline hotkeys

export type Limits = {
  sportsAllowed: number;        // 1 = locked to one sport
  homeClips: number;            // visible clip slots for home
  awayClips: number;            // visible clip slots for away
  hotkeysHome: number;          // hotkey count shown for Home
  hotkeysAway: number;          // hotkey count shown for Away
};

export type Plan = {
  id: PlanId;
  label: string;
  priceLabel: string;
  features: Record<FeatureKey, boolean>;
  limits: Limits;
  notes?: string;
};

/**
 * Your tiers (from our convo):
 * - Demo: free/hidden, 1 sport, 1 clip total (top slot), no save/export,
 *         only 2 home + 2 away hotkeys, and Home/Away +2 and +3 scoring.
 * - Studio Monthly: 28.99, 1 sport (select at purchase)
 * - Plus Monthly: 39.99, all features
 * - Creator Yearly: 198.97, all features (annual)
 * - Pro (one-time): 349.99 (or your final price), all features
 */
export const PLANS: Record<PlanId, Plan> = {
  demo: {
    id: "demo",
    label: "Demo",
    priceLabel: "Free",
    features: {
      multiSports: false,
      videoClips: true,
      saveExport: false,
      advancedStats: false,
      hotkeysExtended: false,
    },
    limits: {
      sportsAllowed: 1,
      homeClips: 1,
      awayClips: 0,
      hotkeysHome: 2,
      hotkeysAway: 2,
    },
    notes:
      "Demo: 1 sport, 1 clip (Home top slot), no export, limited hotkeys (2+2) plus basic +2/+3 scoring.",
  },

  studioMonthly: {
    id: "studioMonthly",
    label: "Studio",
    priceLabel: "$28.99/mo",
    features: {
      multiSports: false,
      videoClips: true,
      saveExport: true,
      advancedStats: false,
      hotkeysExtended: true,
    },
    limits: {
      sportsAllowed: 1,
      homeClips: 6,
      awayClips: 6,
      hotkeysHome: 8,
      hotkeysAway: 8,
    },
  },

  plusMonthly: {
    id: "plusMonthly",
    label: "Plus",
    priceLabel: "$39.99/mo",
    features: {
      multiSports: true,
      videoClips: true,
      saveExport: true,
      advancedStats: true,
      hotkeysExtended: true,
    },
    limits: {
      sportsAllowed: 999,
      homeClips: 12,
      awayClips: 12,
      hotkeysHome: 20,
      hotkeysAway: 20,
    },
  },

  creatorYearly: {
    id: "creatorYearly",
    label: "Creator (Yearly)",
    priceLabel: "$198.97/yr",
    features: {
      multiSports: true,
      videoClips: true,
      saveExport: true,
      advancedStats: true,
      hotkeysExtended: true,
    },
    limits: {
      sportsAllowed: 999,
      homeClips: 12,
      awayClips: 12,
      hotkeysHome: 20,
      hotkeysAway: 20,
    },
  },

  proOneTime: {
    id: "proOneTime",
    label: "SportSight Pro (One-Time)",
    priceLabel: "$349.99 one-time",
    features: {
      multiSports: true,
      videoClips: true,
      saveExport: true,
      advancedStats: true,
      hotkeysExtended: true,
    },
    limits: {
      sportsAllowed: 999,
      homeClips: 12,
      awayClips: 12,
      hotkeysHome: 20,
      hotkeysAway: 20,
    },
  },
};

// --- helpers ---------------------------------------------------------------

/** Where we remember the user’s plan in the browser (for now). */
export const PLAN_STORAGE_KEY = "svpro:plan";

/**
 * Get current plan id (from localStorage, URL ?plan=, or default to demo).
 * In production you’ll replace this with your real auth/subscription info.
 */
export function getCurrentPlanId(): PlanId {
  const url = new URL(window.location.href);
  const q = url.searchParams.get("plan");
  if (q && isPlanId(q)) {
    localStorage.setItem(PLAN_STORAGE_KEY, q);
    // remove query noise
    url.searchParams.delete("plan");
    window.history.replaceState({}, "", url.toString());
    return q;
  }
  const saved = localStorage.getItem(PLAN_STORAGE_KEY);
  if (saved && isPlanId(saved)) return saved;
  return "demo";
}

export function isPlanId(s: string): s is PlanId {
  return ["demo", "studioMonthly", "plusMonthly", "creatorYearly", "proOneTime"].includes(s);
}

export function getPlan(planId: PlanId = getCurrentPlanId()): Plan {
  return PLANS[planId];
}

export function hasFeature(feature: FeatureKey, planId: PlanId = getCurrentPlanId()): boolean {
  return getPlan(planId).features[feature];
}

export function getLimits(planId: PlanId = getCurrentPlanId()): Limits {
  return getPlan(planId).limits;
}
