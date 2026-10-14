import { emitKeypressEvents } from 'node:readline';
import { createInterface } from 'node:readline/promises';


const assertInteractive = () : void => {
  if ( ! process.stdin.isTTY || ! process.stdout.isTTY )
    throw new Error( 'Interactive input requires a terminal' );
};


export const prompt = async ( message: string ) : Promise< string > => {
  assertInteractive();

  const rl = createInterface( { input: process.stdin, output: process.stdout } );

  try { return ( await rl.question( message ) ).trim() }
  finally { rl.close() }
};


export const promptPassword = async ( message: string ) : Promise< string > => {
  assertInteractive();
  emitKeypressEvents( process.stdin );

  const stdin = process.stdin;
  const stdout = process.stdout;

  return new Promise( ( resolve, reject ) => {
    let value = '', rawMode = false, settled = false;
    let finish: ( err?: Error ) => void = () => {};

    const onKeypress = ( character: string, key: { name?: string; ctrl?: boolean } ) : void => {
      if ( key.ctrl && ( key.name === 'c' || key.name === 'd' ) ) return finish( new Error( 'Input cancelled' ) );
      if ( key.name === 'return' || key.name === 'enter' ) return finish();

      if ( key.name === 'backspace' ) {
        value = Array.from( value ).slice( 0, -1 ).join( '' );
        return;
      }

      if ( character && ! key.ctrl ) value += character;
    };

    const onError = ( err: Error ) : void => finish( err );
    const onClose = () : void => finish( new Error( 'Input cancelled' ) );

    finish = ( err?: Error ) : void => {
      if ( settled ) return;
      settled = true;

      stdin.removeListener( 'keypress', onKeypress );
      stdin.removeListener( 'error', onError );
      stdin.removeListener( 'close', onClose );

      try { if ( rawMode ) stdin.setRawMode( false ) }
      catch ( E ) { err ??= E instanceof Error ? E : new Error( String( E ) ) }
      finally { stdin.pause(), stdout.write( '\n' ) }

      if ( err ) reject( err );
      else resolve( value );
    };

    try {
      stdout.write( message );
      stdin.setRawMode( true );
      rawMode = true;

      stdin.on( 'keypress', onKeypress );
      stdin.on( 'error', onError );
      stdin.on( 'close', onClose );
      stdin.resume();
    } catch ( err ) {
      finish( err instanceof Error ? err : new Error( String( err ) ) );
    }
  } );
};


export const confirm = async ( message: string ) : Promise< boolean > => {
  const answer = await prompt( `${ message } [y/N] ` );
  return /^y(?:es)?$/i.test( answer );
};
