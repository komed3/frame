import { closeDatabase, db } from '../src/server/db';
import { addMediaRoot, setMediaRootEnabled } from '../src/server/media/roots';


function main () : void {
  const [ command, value ] = process.argv.slice( 2 );

  try {
    switch ( command ) {
      case 'add': {
        if ( ! value ) throw Error();

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
        if ( ! value || ! /^\d+$/.test( value ) ) throw Error();

        const id = Number( value );
        const root = db.prepare( 'SELECT id FROM media_roots WHERE id = ?' ).get( id );

        if ( ! root ) throw new Error( `Media root ${ id } does not exist` );

        setMediaRootEnabled( id, command === 'enable' );
        console.log( `Media root ${ id } ${ command }d.` );
        break;
      }
    }
  } catch {}
}
