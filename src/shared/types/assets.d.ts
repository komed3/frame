export type MediaAssetKind = 'poster' | 'thumb' | 'frames' | 'wave' | 'text' | 'subtitle';

export interface MediaAssetRecord {
  id: string;
  mediaId: string;
  kind: MediaAssetKind;
  variant: string;
  path: string;
  fingerprint: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  data: Record< string, unknown >;
  createdAt: string;
}

type MediaAssetRow = Omit< MediaAssetRecord, 'data' > & {
  dataJson: string;
};

export type MediaAssetInput = Pick< MediaAssetRecord, 'kind' | 'path' > & Partial< Pick< MediaAssetRecord,
  'variant' | 'fingerprint' | 'mimeType' | 'sizeBytes' | 'width' | 'height' | 'data'
> >;