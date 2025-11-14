import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { media } from '../utils/config.js';
import { searchIndex } from '../utils/search.js';

export async function video ( req, res ) {

    const videoId = req.params.id || '';
    const videoDir = join( media, videoId );

    if ( ! existsSync( videoDir ) ) res.status( 400 ).json( {
        msg: req.t( 'error.video.notExists' )
    } );

    else try { res.status( 200 ).json( {
        data: JSON.parse( await readFile( join( videoDir, 'video.json' ) ) ),
        i18n: req.t( 'player', { returnObjects: true } )
    } ) }

    catch ( err ) { res.status( 500 ).json( {
        msg: req.t( 'error.video.data' )
    } ) }

}

export async function like ( req, res ) {

    const rating = await searchIndex.like( req.params.id || '' );
    if ( rating ) res.status( 200 ).json( { rating } );
    else res.sendStatus( 400 );

}

export async function dislike ( req, res ) {

    const rating = await searchIndex.dislike( req.params.id || '' );
    if ( rating ) res.status( 200 ).json( { rating } );
    else res.sendStatus( 400 );

}
