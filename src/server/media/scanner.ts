import { readdir, stat } from 'node:fs/promises';
import { basename, extname, relative, sep } from 'node:path';
import { db } from '../db';
import type { MediaRoot } from './roots';


type MediaType = 'video' | 'audio' | 'image' | 'text';


const extensions: Record< string, { type: MediaType, mime: string } > = {};

function registerExtensions ( type: MediaType, mimeTypes: Record< string, string > ) : void {
  for ( const [ extension, mime ] of Object.entries( mimeTypes ) ) extensions[ extension ] = { type, mime };
}

registerExtensions( 'video', {
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.webm': 'video/webm',
  '.mpg': 'video/mpeg', '.mpeg': 'video/mpeg', '.mts': 'video/mp2t',
  '.m2ts': 'video/mp2t', '.ts': 'video/mp2t', '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv', '.ogv': 'video/ogg', '.3gp': 'video/3gpp'
} );

registerExtensions( 'audio', {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.flac': 'audio/flac', '.ogg': 'audio/ogg', '.opus': 'audio/opus',
  '.wav': 'audio/wav', '.wma': 'audio/x-ms-wma', '.aiff': 'audio/aiff',
  '.aif': 'audio/aiff', '.ape': 'audio/ape', '.mid': 'audio/midi',
  '.midi': 'audio/midi'
} );

registerExtensions( 'image', {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.bmp': 'image/bmp', '.tif': 'image/tiff', '.tiff': 'image/tiff',
  '.svg': 'image/svg+xml', '.heic': 'image/heic', '.heif': 'image/heif'
} );

registerExtensions( 'text', {
  '.txt': 'text/plain'
} );


const upsertMedia = db.prepare( `
  INSERT INTO media (
    relative_path, media_root_id, root_relative_path,
    file_name, media_type, mime_type, title,
    file_size, file_mtime_ms, scanned_at
  )
  VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' ) )
  ON CONFLICT ( media_root_id, root_relative_path ) DO UPDATE SET
    relative_path = excluded.relative_path,
    file_name = excluded.file_name,
    media_type = excluded.media_type,
    mime_type = excluded.mime_type,
    title = excluded.title,
    file_size = excluded.file_size,
    file_mtime_ms = excluded.file_mtime_ms,
    scanned_at = excluded.scanned_at,
    updated_at = strftime( '%Y-%m-%dT%H:%M:%fZ', 'now' )
` );
