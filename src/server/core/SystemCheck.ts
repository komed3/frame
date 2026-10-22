import { ui } from '@/src/maintenance/utils/ui';
import { CheckResult } from '@/src/shared/types/check';
import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { cpus, totalmem } from 'node:os';


export class SystemCheck {
  private static executable ( name: string ) : string | null {
    const result = spawnSync( name, [ '-version' ], { encoding: 'utf8', timeout: 5e3 } );
    if ( result.error || result.status !== 0 ) return null;
    return result.stdout.trim().split( '\n' )[ 0 ] || `${ name } is available`;
  }

  private static canWrite () : boolean {
    try { accessSync( process.cwd(), constants.W_OK ); return true }
    catch { return false }
  }

  public static run () : boolean {
    ui.headline( 'Check system requirements', '[System]' );
    ui.nl();

    const version = process.versions.node.split( '.' ).map( Number );
    const nodeOk = version[ 0 ] > 22 || ( version[ 0 ] === 22 && version[ 1 ] >= 5 );
    const memory = totalmem(), cores = cpus().length, writable = this.canWrite();
    const ffmpeg = this.executable( 'ffmpeg' ), ffprobe = this.executable( 'ffprobe' );

    const checks: CheckResult[] = [ {
      name: 'Node.js', ok: nodeOk, message: nodeOk
        ? `Version ${ process.versions.node }`
        : `Version ${ process.versions.node } is too old; require Node.js >=22.5`
    }, {
      name: 'RAM', ok: memory >= 2 * 1024 ** 3, warning: memory >= 2 * 1024 ** 3 && memory < 4 * 1024 ** 3,
      message: `${ ( memory / 1024 ** 3 ).toFixed( 1 ) } GiB installed; at least 2 GiB required${
        memory < 4 * 1024 ** 3 ? ', 4 GiB recommended' : ''
      }`
    }, {
      name: 'CPU', ok: cores >= 2, warning: cores < 2,
      message: `${ cores } logical core(s)${ cores < 2 ? '; processing may be slow' : '' }`
    }, {
      name: 'FFmpeg', ok: !! ffmpeg,
      message: ffmpeg ?? 'Not found or not executable; install FFmpeg and check PATH'
    }, {
      name: 'ffprobe', ok: !! ffprobe,
      message: ffprobe ?? 'Not found or not executable; install ffprobe and check PATH'
    }, {
      name: 'Write access', ok: writable, message: writable
        ? 'Current directory is writable'
        : 'Current directory is not writable; run Frame from a directory where you have write access'
    } ];

    let errors = 0;

    for ( const check of checks ) {
      if ( check.warning ) ui.warning( `${ check.name}: ${ check.message }` );
      else if ( check.ok ) ui.success( `${ check.name}: ${ check.message }` );
      else ui.error( `${ check.name}: ${ check.message }` ), errors++;
    }

    ui.nl();

    if ( errors ) ui.error( `System check failed: ${ errors } requirement(s) not met.` );
    else ui.success( 'All required system checks passed.' );

    return errors === 0;
  }
}
