/**
 * Representa um modelo de IA gerenciado pela aplicação.
 */
export interface ManagedModel {
  /** Identificador único do modelo. */
  id: string;
  /** Nome de exibição do modelo. */
  name: string;
  /** Nome do grupo ao qual o modelo pertence. */
  groupLabel: string;
  /** Indica se o modelo já está armazenado no cache local. */
  isCached: boolean;
  /** Tamanho do modelo, em bytes. */
  size: number;
}

/**
 * Representa informações sobre o espaço de armazenamento utilizado pela aplicação.
 */
export interface StorageEstimateInfo {
  /** Espaço de armazenamento utilizado, em gigabytes. */
  usedGB: string;
  /** Espaço total disponível para armazenamento, em gigabytes. */
  quotaGB: string;
  /** Percentual do espaço de armazenamento utilizado. */
  percent: number;
}