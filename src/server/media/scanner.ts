import { db } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';
import { mediaRoots } from '@/src/server/media/roots';
import type { MediaRoot, MediaType, ScanResult, ScannedFile } from '@/src/shared/types';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, extname, relative, resolve } from 'node:path';


const extensions: Record< MediaType, Set< string > > = {
  video: new Set( [ '.avi', '.m2ts', '.m4v', '.mkv', '.mov', '.mp4', '.mpeg', '.mpg', '.ogv', '.ts', '.webm', '.wmv' ] ),
  audio: new Set( [ '.aac', '.aif', '.aiff', '.alac', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav', '.wma' ] ),
  image: new Set( [ '.avif', '.bmp', '.gif', '.heic', '.jpeg', '.jpg', '.png', '.svg', '.tif', '.tiff', '.webp' ] ),
  text: new Set( [ '.txt' ] ),
  other: new Set( [] )
};

const mimeTypes: Record< string, string > = {
  video: 'video/*', audio: 'audio/*', image: 'image/*', text: 'text/plain'
};


export class MediaScanner {
  private classify ( path: string ) : MediaType | null {
    const extension = extname( path ).toLowerCase();

    for ( const [ type, values ] of Object.entries( extensions ) as [ MediaType, Set< string > ][] )
      if ( values.has( extension ) ) return type;

    return null;
  }
}
