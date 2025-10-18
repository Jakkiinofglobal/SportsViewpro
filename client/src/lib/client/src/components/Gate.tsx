// client/src/components/Gate.tsx
import React, { ReactNode } from "react";
import { FeatureKey, hasFeature, getCurrentPlanId } from "@/lib/tiers";

type GateProps = {
  feature: FeatureKey;
  children: ReactNode;
  /**
   * Called when a user clicks a locked control.
   * Use this to open the UpgradeModal.
   */
  onBlockedClick?: () => void;
  /** If true, render the child but make it look disabled and intercept clicks. */
  soft?: boolean;
  className?: string;
};

export const Gate: React.FC<GateProps> = ({
  feature,
  children,
  onBlockedClick,
  soft = true,
  className = "",
}) => {
  const plan = getCurrentPlanId();
  const allowed = hasFeature(feature, plan);

  if (allowed) {
    return <>{children}</>;
  }

  // Soft gate = show UI but intercept clicks + greyed out
  if (soft) {
    return (
      <div className={`relative inline-block ${className}`}>
        <div
          aria-disabled
          className="pointer-events-none opacity-50 select-none"
        >
          {children}
        </div>
        {/* Click-catcher */}
        <button
          type="button"
          onClick={onBlockedClick}
          className="absolute inset-0 cursor-not-allowed bg-transparent"
          aria-label="Upgrade required"
          title="Upgrade required"
        />
      </div>
    );
  }

  // Hard gate = show a small “Upgrade” button instead
  return (
    <button
      type="button"
      onClick={onBlockedClick}
      className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-3 py-2 rounded"
      title="Upgrade to unlock"
    >
      Upgrade to unlock
    </button>
  );
};

export default Gate;
