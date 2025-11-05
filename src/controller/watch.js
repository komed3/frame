import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function watch ( req, res ) {

    try {

        const videoId = req.params.id || '';
        const videoDir = join( process.cwd(), 'media', videoId );
        const data = JSON.parse( readFileSync( join( videoDir, 'video.json' ), 'utf8' ) || '{}' );

        if ( ! data || ! data.videoId || ! data.fileId ) return res.redirect( '/' );
        else res.render( 'watch', { data, title: data.content.title } );

    } catch { res.redirect( '/' ) }

}
