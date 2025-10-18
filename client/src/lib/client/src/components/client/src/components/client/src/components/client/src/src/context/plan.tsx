import React, {createContext, useContext, useMemo} from 'react';
import { FEATURES, LIMITS } from '@/config/tiers';
import type { PlanId } from '@/config/tiers';
import { useUserPrefs } from '@/context/userPrefs';

type Ctx = {
  plan: PlanId;
  limits: typeof LIMITS[PlanId];
  canUse: (k: keyof typeof FEATURES)=>boolean;
  setPlan: (p: PlanId)=>void;
};
const Ctx = createContext<Ctx|null>(null);

export const PlanProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const { prefs, setPlan } = useUserPrefs();
  const limits = useMemo(()=>LIMITS[prefs.plan], [prefs.plan]);
  const canUse = (k: keyof typeof FEATURES) => FEATURES[k].includes(prefs.plan);

  return <Ctx.Provider value={{ plan: prefs.plan, limits, canUse, setPlan }}>{children}</Ctx.Provider>;
};

export const usePlan = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('usePlan must be used within PlanProvider');
  return c;
};
