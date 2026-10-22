import { ui } from '@/src/maintenance/utils/ui';
import type { CheckResult } from '@/src/shared/types/check';
import { accessSync, constants } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { spawnSync } from 'node:child_process';


export class SystemCheck {
  private static executable ( name: string ) : string | null {
    const result = spawnSync( name, [ '-version' ], { encoding: 'utf8', timeout: 5e3 } );
    if ( result.error || result.status !== 0 ) return null;
    return result.stdout.trim().split( '\n' )[ 0 ] || `${ name } is available`;
  }
}
