import { createReadStream, existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { media } from '../utils/config.js';

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

export async function stream ( req, res ) {

    try {

        const videoPath = join( media, req.headers.videoId, req.headers.file );
        const stat = statSync( videoPath );
        const fileSize = stat.size;
        const contentType = req.headers.contentType;
        const range = req.headers.range;

        if ( range ) {

            // Parse range header (e.g., "bytes=0-1023")
            const parts = range.replace( /bytes=/, '' ).split( '-' );
            const start = parseInt( parts[ 0 ], 10 );
            const end = parts[ 1 ] ? parseInt( parts[ 1 ], 10 ) : fileSize - 1;

            // Validate range
            if ( start >= fileSize || end >= fileSize ) {
                res.status( 416 ).send( 'Requested range not satisfiable' );
                return;
            }

            const chunksize = ( end - start ) + 1;
            const file = createReadStream( videoPath, { start, end } );

            const head = {
                'Content-Range': `bytes $${start}-$$ {end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000'
            };

            res.writeHead( 206, head );
            file.pipe( res );

        } else {

            // No range requested, send entire file
            const head = {
                'Content-Length': fileSize,
                'Content-Type': contentType,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=31536000'
            };

            res.writeHead( 200, head );
            createReadStream( videoPath ).pipe( res );

        }

    } catch ( err ) { res.status( 404 ).send( 'Video not found' ) }

}
