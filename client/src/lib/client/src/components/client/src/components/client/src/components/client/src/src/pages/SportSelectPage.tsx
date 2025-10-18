import React from 'react';
import { useUserPrefs } from '@/context/userPrefs';
import { useNavigate } from 'react-router-dom';
import { FEATURES } from '@/config/tiers';

const ALL_SPORTS = ['DemoBall','Basketball','Football','Baseball'];

export default function SportSelectPage() {
  const { prefs, setSelectedSport } = useUserPrefs();
  const nav = useNavigate();

  const canMulti = FEATURES.multiSports.includes(prefs.plan);
  const enabledSports = canMulti ? ALL_SPORTS : ['DemoBall'];

  return (
    <div className="min-h-screen grid place-items-center bg-[#0E1116]">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-2">Select your sport</h2>
        <p className="text-sm text-gray-600 mb-4">
          Plan: <b>{prefs.plan}</b>{!canMulti && ' — upgrade to unlock all sports'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ALL_SPORTS.map(s => {
            const enabled = enabledSports.includes(s);
            return (
              <button
                key={s}
                className={`border rounded-xl p-4 text-left ${enabled ? '' : 'opacity-40 cursor-not-allowed'}`}
                onClick={()=> enabled && (setSelectedSport(s), nav('/'))}
              >
                <div className="font-semibold">{s}</div>
                {!enabled && <div className="text-xs text-gray-500 mt-1">Locked in {prefs.plan}</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
