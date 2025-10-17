import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TIER, LIMITS, Tier, TIER_LABELS } from './tiers';

type LicenseState = {
  tier: Tier;
  setTier: (t: Tier) => void;
  can: (feature: keyof typeof LIMITS) => boolean;
  limit: <K extends keyof typeof LIMITS>(feature: K) => (typeof LIMITS)[K][Tier];
  label: string;
};

const LicenseCtx = createContext<LicenseState | null>(null);
const KEY = 'sportsight.tier';

export const LicenseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tier, setTierState] = useState<Tier>(DEFAULT_TIER);

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Tier | null;
    if (saved && TIER_LABELS[saved]) setTierState(saved);
  }, []);

  const setTier = (t: Tier) => {
    setTierState(t);
    localStorage.setItem(KEY, t);
  };

  const can: LicenseState['can'] = (feature) => {
    const v = LIMITS[feature][tier];
    return typeof v === 'boolean' ? v : (typeof v === 'number' ? v > 0 : !!v);
  };

  const limit: LicenseState['limit'] = (feature) => LIMITS[feature][tier];

  const value = useMemo<LicenseState>(() => ({
    tier, setTier, can, limit, label: TIER_LABELS[tier],
  }), [tier]);

  return <LicenseCtx.Provider value={value}>{children}</LicenseCtx.Provider>;
};

export const useLicense = () => {
  const ctx = useContext(LicenseCtx);
  if (!ctx) throw new Error('useLicense must be used within LicenseProvider');
  return ctx;
};