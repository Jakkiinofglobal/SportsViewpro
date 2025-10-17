import React from 'react';
import { useLicense } from './context';

type GateProps = {
  feature?: keyof typeof import('./tiers').LIMITS;
  required?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

export const Gate: React.FC<GateProps> = ({ feature, required = false, fallback, children }) => {
  const lic = useLicense();
  const ok = feature ? lic.can(feature) : true;

  if (required && !ok) return <>{fallback ?? null}</>;

  if (!ok) {
    return (
      <div style={{ position: 'relative', opacity: 0.5, pointerEvents: 'none' }}>
        {children}
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.25)', pointerEvents: 'auto'
          }}
          title="Upgrade to unlock this feature"
        >
          <span style={{
            background: '#111', color: '#fff', padding: '6px 10px',
            borderRadius: 8, border: '1px solid #333'
          }}>🔒 Upgrade to unlock</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};