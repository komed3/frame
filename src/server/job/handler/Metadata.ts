import { MediaRoots } from '@/src/server/media/Roots';
import { Media } from '@/src/server/media/Media';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import type { MediaType, MediaUpdate } from '@/src/shared/types/media';
import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { promisify } from 'node:util';


export class MetadataJob implements JobHandler {
  private number ( value: string | number | undefined ) : number | null {
    if ( value === undefined || value === '' ) return null;

    const parsed = Number( value );
    return Number.isFinite( parsed ) ? parsed : null;
  }

  private positive ( value: string | number | undefined ) : number | null {
    const parsed = this.number( value );
    return parsed !== null && parsed > 0 ? parsed : null;
  }

  private parseRate ( value?: string ) : number | null {
    if ( ! value ) return null;

    const [ numerator, denominator ] = value.split( '/' ).map( Number );
    if ( ! denominator || ! Number.isFinite( numerator ) || ! Number.isFinite( denominator ) ) return null;

    const rate = numerator / denominator;
    return Number.isFinite( rate ) && rate > 0 ? rate : null;
  }
}
