import { closeDatabase, db } from '../src/server/db';
import { addMediaRoot, setMediaRootEnabled } from '../src/server/media/roots';


function usage () : never {
  console.log( 'Usage:' );
  console.log( 'npm run media-roots -- add <path>     Add media root' );
  console.log( 'npm run media-roots -- list           List all media roots' );
  console.log( 'npm run media-roots -- enable <id>    Enable media root' );
  console.log( 'npm run media-roots -- disable <id>   Disable media root' );
  process.exit( 1 );
}

function main () : void {
  const [ command, value ] = process.argv.slice( 2 );

  switch ( command ) {
    case 'add': {
      if ( ! value ) usage();

      const id = addMediaRoot( value );
      console.log( `Media root registered with ID ${ id }` );
      break;
    }

    case 'list': {
      const roots = db.prepare( `
        SELECT id, path, enabled, last_scan_at
        FROM media_roots
        ORDER BY id
      ` ).all() as {
        id: number;
        path: string;
        enabled: number;
        last_scan_at: string | null;
      }[];

      if ( roots.length === 0 ) {
        console.log( 'No media roots registered.' );
        break;
      }

      for ( const root of roots ) console.log(
        `${ root.id } [${ root.enabled ? 'enabled' : 'disabled' }] ` +
        `${ root.path } (last scan: ${ root.last_scan_at || 'never' })`
      );

      break;
    }

    case 'enable': case 'disable': {
      if ( ! value || ! /^\d+$/.test( value ) ) usage();

      const id = Number( value );
      const root = db.prepare( 'SELECT id FROM media_roots WHERE id = ?' ).get( id );
      if ( ! root ) throw new Error( `Media root ${ id } does not exist` );

      setMediaRootEnabled( id, command === 'enable' );
      console.log( `Media root ${ id } ${ command }d.` );
      break;
    }

    default: usage();
  }
}


try { main() }
catch ( error ) {
  console.error( error );
  process.exitCode = 1;
}
finally { closeDatabase() }
