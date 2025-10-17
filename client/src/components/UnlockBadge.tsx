import React, { useState } from 'react';
import { useLicense } from '../licensing/context';
import { Tier, TIER_LABELS } from '../licensing/tiers';

const ALL: Tier[] = ['DEMO','STUDIO','PLUS','CREATOR','PRO'];

export const UnlockBadge: React.FC = () => {
  const { label, tier, setTier } = useLicense();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', top: 10, right: 10, zIndex: 9999,
          background: '#0f172a', color: 'white', border: '1px solid #334155',
          borderRadius: 8, padding: '6px 10px', cursor: 'pointer'
        }}
        title="Change plan / unlock features"
      >
        🔑 {label}
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 360, background: '#0b1020', color: '#e2e8f0',
              border: '1px solid #334155', borderRadius: 12, padding: 16 }}
          >
            <h3 style={{ marginTop: 0 }}>Select Plan</h3>
            {ALL.map(t => (
              <button
                key={t}
                onClick={() => { setTier(t); setOpen(false); }}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 12px', margin: '8px 0',
                  borderRadius: 8, border: '1px solid #334155',
                  background: t === tier ? '#1e293b' : '#0f172a',
                  color: 'white', cursor: 'pointer'
                }}
              >
                {TIER_LABELS[t]}
              </button>
            ))}
            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
              (Temporary client-side gating for demos. We’ll wire Stripe/PayPal next.)
            </p>
          </div>
        </div>
      )}
    </>
  );
};