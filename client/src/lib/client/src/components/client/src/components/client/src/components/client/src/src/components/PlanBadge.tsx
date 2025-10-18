import React, { useState } from 'react';
import { usePlan } from '@/context/plan';
import { ALL_PLANS } from '@/config/tiers';

const PlanBadge: React.FC = () => {
  const { plan, setPlan } = usePlan();
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed top-3 right-3 z-40">
      <button className="text-xs border rounded px-2 py-1 bg-white" onClick={()=>setOpen(o=>!o)}>
        Plan: {plan}
      </button>
      {open && (
        <div className="mt-2 bg-white rounded shadow p-2">
          {ALL_PLANS.map(p => (
            <button key={p} className="block text-left w-full text-xs px-2 py-1 hover:bg-gray-100"
              onClick={()=>{ setPlan(p); setOpen(false); }}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
export default PlanBadge;
