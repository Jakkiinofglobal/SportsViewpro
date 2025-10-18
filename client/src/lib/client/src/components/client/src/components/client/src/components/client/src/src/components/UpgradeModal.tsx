import React from 'react';
import { usePlan } from '@/context/plan';
import type { PlanId } from '@/config/tiers';

const tiers: { id: PlanId; label: string }[] = [
  { id: 'studioMonthly', label: 'Studio Monthly' },
  { id: 'plusMonthly', label: 'Plus Monthly' },
  { id: 'creatorYearly', label: 'Creator Yearly' },
  { id: 'proOneTime', label: 'Pro Studio (Lifetime)' },
];

export default function UpgradeModal({open,onClose}:{open:boolean;onClose:()=>void}) {
  const { plan, setPlan } = usePlan();
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/55 grid place-items-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-2">Unlock this feature</h2>
        <p className="text-sm text-gray-600 mb-4">Current plan: <b>{plan}</b></p>
        <div className="space-y-2">
          {tiers.map(t => (
            <button key={t.id}
              className="w-full text-left border rounded-xl p-3 hover:bg-gray-50"
              onClick={()=>{ setPlan(t.id); onClose(); }}>
              Switch to <b>{t.label}</b> (test)
            </button>
          ))}
        </div>
        <button className="mt-4 text-sm text-gray-500" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
