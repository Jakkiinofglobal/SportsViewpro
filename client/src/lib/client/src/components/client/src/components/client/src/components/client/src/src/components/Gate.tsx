import React from 'react';
import { usePlan } from '@/context/plan';

const Gate: React.FC<{
  feature: Parameters<ReturnType<typeof usePlan>['canUse']>[0],
  onLocked?: ()=>void,
  mode?: 'disable'|'hide',
  children: React.ReactNode
}> = ({feature,onLocked,mode='disable',children}) => {
  const { canUse } = usePlan();
  const ok = canUse(feature);
  if (ok) return <>{children}</>;
  if (mode==='hide') return null;
  return (
    <div onClick={(e)=>{e.stopPropagation(); onLocked?.();}}
         style={{ opacity: .45, pointerEvents: 'auto', cursor: 'not-allowed' }} aria-disabled>
      {children}
    </div>
  );
};
export default Gate;
