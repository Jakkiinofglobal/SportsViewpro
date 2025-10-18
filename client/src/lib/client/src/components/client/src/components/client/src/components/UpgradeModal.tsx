// client/src/components/UpgradeModal.tsx
import React from "react";
import { getCurrentPlanId } from "@/lib/tiers";

type Props = {
  open: boolean;
  onClose: () => void;
};

const PRICING_URL = "/pricing"; // change to a real route or external checkout later

export default function UpgradeModal({ open, onClose }: Props) {
  if (!open) return null;

  const plan = getCurrentPlanId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold mb-2">Upgrade to unlock</h2>
        <p className="text-sm text-gray-600 mb-4">
          Your current plan is <span className="font-semibold">{plan}</span>.
          To use this feature, upgrade to a higher tier.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <PlanCard
            title="Studio"
            price="$28.99/mo"
            bullets={[
              "1 sport (choose at purchase)",
              "Save/Export",
              "More hotkeys & clip slots",
            ]}
          />
          <PlanCard
            title="Plus"
            price="$39.99/mo"
            bullets={[
              "All features",
              "Multi-sport",
              "Advanced overlays/stats",
            ]}
          />
          <PlanCard
            title="Creator (Yearly)"
            price="$198.97/yr"
            bullets={["All features", "Best yearly value"]}
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <a
            href={PRICING_URL}
            className="inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            See plans & upgrade
          </a>
          <button
            onClick={onClose}
            className="rounded border px-3 py-2 text-gray-700 hover:bg-gray-50"
          >
            Not now
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-3">
          (For now this modal is informational. Real payments come next—PayPal/Stripe
          checkout → grant the plan → the gates open.)
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  title,
  price,
  bullets,
}: {
  title: string;
  price: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="font-bold">{title}</div>
      <div className="text-sm text-gray-600 mb-2">{price}</div>
      <ul className="text-sm list-disc ml-5 space-y-1">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
