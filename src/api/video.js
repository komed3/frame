import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { media } from '../utils/config.js';

export async function video ( req, res ) {

    const videoId = req.params.id || '';
    const videoDir = join( media, videoId );

    if ( ! await access( videoDir ) ) res.status( 400 ).json( { msg: req.t( 'error.video.notExists' ) } );
    else try { res.status( 200 ).json( JSON.parse( await readFile( join( videoDir, 'video.json' ) ) ) ) }
    catch ( err ) { res.status( 500 ).json( { msg: req.t( 'error.video.data' ) } ) }

}
