import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function watch ( req, res ) {

    if ( ! req.params || ! req.params.id ) res.redirect( '/' );

    const videoId = req.params.id;
    const videoDir = join( process.cwd(), 'media', videoId );
    const data = JSON.parse( readFileSync( join( videoDir, 'data.json' ), 'utf8' ) || '{}' );
    const stream = '/media/' + videoId + '/' + data.fileName;

    if ( ! data || ! data.videoId || ! data.fileId ) return res.redirect( '/' );
    else res.render( 'watch', { video: data, stream } );

}