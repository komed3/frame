export type MediaSearchSort =
  | 'id' | 'rootId' | 'type' | 'title' | 'fileName' | 'path' | 'mimeType' | 'sizeBytes'
  | 'modifiedAt' | 'fileHash' | 'fingerprint' | 'creator' | 'rating' | 'releasedAt'
  | 'recordedAt' | 'language' | 'durationMs' | 'width' | 'height' | 'fps' | 'bitrate'
  | 'container' | 'videoCodec' | 'audioCodec' | 'sampleRate' | 'channels' | 'encoding'
  | 'scannedAt' | 'createdAt' | 'updatedAt' | 'relevance';

export type MediaSearchDirection = 'asc' | 'desc';
export type MediaSearchQueryMode = 'all' | 'any' | 'phrase';
export type MediaSearchProgress = 'not-started' | 'started' | 'in-progress' | 'completed';
export type MediaSearchAssetKind = 'poster' | 'thumb' | 'frames' | 'wave' | 'text' | 'subtitle';


export interface MediaSearchStringFilter {
  equals?: string;
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  isNull?: boolean;
}

export interface MediaSearchNumberFilter {
  equals?: number;
  min?: number;
  max?: number;
  isNull?: boolean;
}

export interface MediaSearchDateFilter {
  equals?: string;
  from?: string;
  to?: string;
  isNull?: boolean;
}

export type MediaSearchTextField =
  | 'path' | 'fileName' | 'mimeType' | 'fileHash' | 'fingerprint' | 'title' | 'description'
  | 'creator' | 'language' | 'container' | 'videoCodec' | 'audioCodec' | 'encoding';

export type MediaSearchNumberField =
  | 'id' | 'rootId' | 'sizeBytes' | 'rating' | 'durationMs' | 'width' | 'height' | 'fps'
  | 'bitrate' | 'sampleRate' | 'channels';

export type MediaSearchDateField =
  | 'modifiedAt' | 'releasedAt' | 'recordedAt' | 'scannedAt' | 'createdAt' | 'updatedAt';


export interface MediaSearchMetadataFilter {
  key: string;
  value?: string;
  match?: 'exact' | 'contains' | 'startsWith';
  source?: MediaMetadataSource;
}

export interface MediaSearchTrackFilter {
  kind?: MediaTrackKind;
  codec?: string;
  language?: string;
  title?: string;
  isDefault?: boolean;
  isForced?: boolean;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  minChannels?: number;
  maxChannels?: number;
}

export interface MediaSearchOptions {
  query?: string;
  queryMode?: MediaSearchQueryMode;

  ids?: number[];
  excludeIds?: number[];
  rootIds?: number[];
  types?: MediaType[];
  available?: boolean;
  rootEnabled?: boolean;

  text?: Partial< Record< MediaSearchTextField, MediaSearchStringFilter > >;
  numbers?: Partial< Record< MediaSearchNumberField, MediaSearchNumberFilter > >;
  dates?: Partial< Record< MediaSearchDateField, MediaSearchDateFilter > >;

  tagIds?: number[];
  tagMode?: 'any' | 'all';
  excludeTagIds?: number[];

  categoryIds?: number[];
  categoryMode?: 'any' | 'all';
  excludeCategoryIds?: number[];

  metadata?: MediaSearchMetadataFilter[];
  tracks?: MediaSearchTrackFilter[];

  assetKindsAny?: MediaSearchAssetKind[];
  assetKindsAll?: MediaSearchAssetKind[];
  missingAssetKinds?: MediaSearchAssetKind[];

  userId?: number;
  favorite?: boolean;
  played?: boolean;
  progress?: MediaSearchProgress;

  sortBy?: MediaSearchSort;
  sortDirection?: MediaSearchDirection;
  limit?: number;
  offset?: number;
}

export interface MediaSearchResult {
  items: MediaRecord[];
  total: number;
  limit: number;
  offset: number;
}
