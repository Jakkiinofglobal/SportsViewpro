export type Tier = 'DEMO' | 'STUDIO' | 'PLUS' | 'CREATOR' | 'PRO';

export const TIER_LABELS: Record<Tier, string> = {
  DEMO: 'Demo',
  STUDIO: 'Monthly Studio',
  PLUS: 'Monthly Plus',
  CREATOR: 'Creator (Yearly)',
  PRO: 'SportSight Pro (One-time)',
};

export const LIMITS = {
  sportsSelectable: { DEMO: 1, STUDIO: 1, PLUS: 999, CREATOR: 999, PRO: 999 },
  videoClipsPerTeam: { DEMO: 1, STUDIO: 3, PLUS: 10, CREATOR: 20, PRO: 50 },
  hotkeysPerTeam:    { DEMO: 2, STUDIO: 6, PLUS: 20, CREATOR: 40, PRO: 80 },
  exportEnabled:     { DEMO: false, STUDIO: false, PLUS: true, CREATOR: true, PRO: true },
  saveSessions:      { DEMO: false, STUDIO: false, PLUS: true, CREATOR: true, PRO: true },
  customHotkeysUI:   { DEMO: false, STUDIO: false, PLUS: true, CREATOR: true, PRO: true },
} as const;

export const DEFAULT_TIER: Tier = 'DEMO';