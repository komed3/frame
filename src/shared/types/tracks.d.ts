export type MediaTrackKind = 'video' | 'audio' | 'subtitle' | 'data';

export interface MediaTrackRecord {
  id: number;
  mediaId: number;
  streamIndex: number;
  kind: MediaTrackKind;
  codec: string | null;
  language: string | null;
  title: string | null;
  isDefault: boolean;
  isForced: boolean;
  width: number | null;
  height: number | null;
  fps: number | null;
  bitrate: number | null;
  sampleRate: number | null;
  channels: number | null;
  data: Record< string, unknown >;
}

export type MediaTrackInput = Pick< MediaTrackRecord, 'streamIndex' | 'kind' > &
  Partial< Omit< MediaTrackRecord, 'id' | 'mediaId' | 'streamIndex' | 'kind' > >;
