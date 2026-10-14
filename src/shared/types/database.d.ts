export interface AppliedMigration {
  name: string;
  checksum: string;
  appliedAt: string;
}

export interface DatabaseStats {
  path: string;
  sqliteVersion: string;
  tableCount: number;
  rowCount: number;
  migrationCount: number;
  sizeBytes: number;
  pageCount: number;
  pageSize: number;
  freePages: number;
  integrityCheck: string;
}
