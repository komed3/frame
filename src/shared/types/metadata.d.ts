export type MediaMetadataSource = 'manual' | 'scan';

export interface MediaMetadataRecord {
  id: string;
  mediaId: string;
  key: string;
  value: string;
  source: MediaMetadataSource;
  updatedAt: string;
}

export interface MediaMetadataInput {
  key: string;
  value: string;
}
