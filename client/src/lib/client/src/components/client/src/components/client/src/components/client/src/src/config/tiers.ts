export type PlanId = 'demo'|'studioMonthly'|'plusMonthly'|'creatorYearly'|'proOneTime';

export const FEATURES = {
  multiSports:     ['plusMonthly','creatorYearly','proOneTime'],
  videoClips:      ['studioMonthly','plusMonthly','creatorYearly','proOneTime'],
  saveExport:      ['plusMonthly','creatorYearly','proOneTime'],
  hotkeysExtended: ['plusMonthly','creatorYearly','proOneTime'],
  advancedStats:   ['creatorYearly','proOneTime'],
} as const;

export const LIMITS: Record<PlanId, { clipSlotsPerTeam: number }> = {
  demo: { clipSlotsPerTeam: 1 },
  studioMonthly: { clipSlotsPerTeam: 4 },
  plusMonthly: { clipSlotsPerTeam: 8 },
  creatorYearly: { clipSlotsPerTeam: 999 },
  proOneTime: { clipSlotsPerTeam: 999 },
};

export const ALL_PLANS: PlanId[] = ['demo','studioMonthly','plusMonthly','creatorYearly','proOneTime'];
