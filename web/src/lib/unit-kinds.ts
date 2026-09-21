export const UNIT_KINDS = ['unspecified', 'solu', 'studio', 'other'] as const;
export type UnitKind = (typeof UNIT_KINDS)[number];
