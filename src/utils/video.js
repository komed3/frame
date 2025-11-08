import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export async function hashing ( file ) {

    return new Promise ( ( resolve, reject ) => {

        const hash = createHash( 'sha256' );
        const stream = createReadStream( file );

        stream.on( 'data', chunk => hash.update( chunk ) );
        stream.on( 'error', err => reject( err ) );
        stream.on( 'end', () => resolve( hash.digest( 'hex' ) ) );

    } );

}
