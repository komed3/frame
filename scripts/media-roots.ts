import { closeDatabase, db } from '../src/server/db';
import { addMediaRoot, setMediaRootEnabled } from '../src/server/media/roots';


function main () : void {
  const [ command, value ] = process.argv.slice( 2 );

  try {
    switch ( command ) {
      case 'add':
        const id = addMediaRoot( value );
        console.log( `Media root registered with ID ${ id }` );
        break;
    }
  } catch {}
}
