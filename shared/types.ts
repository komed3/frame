export type MediaType = 'video' | 'audio' | 'image' | 'text' | 'other';

export type MediaJobType =
  | 'scan' | 'metadata' | 'poster' | 'scrubber' | 'image_preview'
  | 'text_preview' | 'audio_cover' | 'waveform';

/**
 * Asset types supported by the media_assets database table.
 *
 * poster: Large representative frame from a video.
 * scrubber: Small video frames plus a time-indexed manifest.
 * image_preview: Reduced preview of a static image file, not a video frame.
 * waveform: Binary amplitude data.
 */
export type MediaAssetType =
  | 'poster' | 'scrubber' | 'image_preview' | 'text_preview'
  | 'audio_cover' | 'waveform';
