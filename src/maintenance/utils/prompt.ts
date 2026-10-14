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
    let value = '';

    const cleanup = () : void => {
      stdin.removeListener( 'keypress', onKeypress );
      stdin.setRawMode( false );
      stdin.pause();
      stdout.write( '\n' );
    };

    const onKeypress = ( character: string, key: { name?: string; ctrl?: boolean } ) : void => {
      if ( key.ctrl && key.name === 'c' ) {
        cleanup();
        reject( new Error( 'Input cancelled' ) );
        return;
      }

      if ( key.name === 'return' || key.name === 'enter' ) {
        cleanup();
        resolve( value );
        return;
      }

      if ( key.name === 'backspace' ) {
        value = Array.from( value ).slice( 0, -1 ).join( '' );
        return;
      }

      if ( character && ! key.ctrl && character.length > 0 ) value += character;
    };

    stdout.write( message );
    stdin.setRawMode( true );
    stdin.resume();
    stdin.on( 'keypress', onKeypress );
  } );
};


export const confirm = async ( message: string ) : Promise< boolean > => {
  const answer = await prompt( `${ message } [y/N] ` );
  return /^y(?:es)?$/i.test( answer );
};
