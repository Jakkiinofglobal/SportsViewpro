import React, { useState } from "react";
import Gate from "@/components/Gate";
import UpgradeModal from "@/components/UpgradeModal";

export default function TestGates() {
  const [open, setOpen] = useState(false);
  const [plan] = useState<"demo" | "plusMonthly" | "proOneTime">("demo");

  return (
    <div style={{ padding: 40 }}>
      <h2>Feature Access Test (Plan: {plan})</h2>

      <Gate feature="videoClips" plan={plan} onBlockedClick={() => setOpen(true)}>
        <button style={{ padding: 10, marginTop: 20 }}>🎥 Play Video Clip</button>
      </Gate>

      <Gate feature="multiSports" plan={plan} onBlockedClick={() => setOpen(true)}>
        <button style={{ padding: 10, marginTop: 20 }}>🏀 Switch Sport</button>
      </Gate>

      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
