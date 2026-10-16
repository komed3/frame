export type MediaMetadataSource = 'manual' | 'scan';

export interface MediaMetadataRecord {
  id: number;
  mediaId: number;
  key: string;
  value: string;
  source: MediaMetadataSource;
  updatedAt: string;
}

export interface MediaMetadataInput {
  key: string;
  value: string;
}
