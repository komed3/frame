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
        msg: req.t( 'error.video.data' ), err
    } ) }

}

export async function rate ( req, res ) {

    const videoId = req.params.id || '';
    const rating = req.body.rating || null;

    try {
        await searchIndex.rateVideo( videoId, rating );
        res.status( 200 ).json( { rating: await searchIndex.getRating( videoId ) } );
    }

    catch ( err ) { res.status( 500 ).json( {
        msg: req.t( 'error.video.rating' ), err
    } ) }

}
