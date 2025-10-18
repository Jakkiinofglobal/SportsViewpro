import React, {createContext, useContext, useEffect, useState} from 'react';
import { useAuth } from '@/context/auth';
import type { PlanId } from '@/config/tiers';

type Prefs = { plan: PlanId; selectedSport: string|null };
type Ctx = {
  prefs: Prefs;
  setPlan: (p: PlanId)=>void;
  setSelectedSport: (s: string)=>void;
};
const Ctx = createContext<Ctx|null>(null);

export const UserPrefsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({ plan: 'demo', selectedSport: null });

  useEffect(() => {
    if (!user) return;
    const users = JSON.parse(localStorage.getItem('SS_USERS') || '{}');
    const rec = users[user.email];
    if (rec) setPrefs({ plan: rec.plan ?? 'demo', selectedSport: rec.selectedSport ?? null });
  }, [user]);

  const save = (next: Prefs) => {
    if (!user) return;
    const users = JSON.parse(localStorage.getItem('SS_USERS') || '{}');
    users[user.email] = { ...(users[user.email]||{}), ...next };
    localStorage.setItem('SS_USERS', JSON.stringify(users));
    setPrefs(next);
  };

  return (
    <Ctx.Provider value={{
      prefs,
      setPlan: (p)=>save({ ...prefs, plan: p }),
      setSelectedSport: (s)=>save({ ...prefs, selectedSport: s })
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useUserPrefs = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useUserPrefs must be used within UserPrefsProvider');
  return c;
};
