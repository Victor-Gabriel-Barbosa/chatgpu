export interface ManagedModel {
  id: string;
  name: string;
  groupLabel: string;
  isCached: boolean;
  size: number;
}

export interface StorageEstimateInfo {
  usedGB: string;
  quotaGB: string;
  percent: number;
}