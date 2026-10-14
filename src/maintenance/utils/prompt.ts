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
