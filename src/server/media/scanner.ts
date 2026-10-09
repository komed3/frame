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
