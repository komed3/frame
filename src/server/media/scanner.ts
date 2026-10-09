import { readdir, stat } from 'node:fs/promises';
import { basename, extname, relative, sep } from 'node:path';
import { db } from '../db';
import type { MediaRoot } from './roots';


type MediaType = 'video' | 'audio' | 'image' | 'text';


const extensions: Record< string, { type: MediaType, mime: string } > = {};


function registerExtensions ( type: MediaType, mimeTypes: Record< string, string > ) : void {
  for ( const [ extension, mime ] of Object.entries( mimeTypes ) ) extensions[ extension ] = { type, mime };
}
