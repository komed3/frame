import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { media, tmp } from '../utils/config.js';
import { searchIndex } from '../utils/search.js';
import { fileHash, generateId, uploadVideo } from '../utils/video.js';

export async function upload ( req, res ) {

    uploadVideo( req, res, async ( err ) => {

        // Error while uploading
        if ( err ) return res.status( 400 ).json( { success: false, message: req.t( 'error.upload.upload', { msg: err.message } ) } );
        if ( ! req.file ) return res.status( 400 ).json( { success: false, message: req.t( 'error.upload.noFile' ) } );

        // Prepare streaming (send NDJSON lines)
        res.setHeader( 'Content-Type', 'application/x-ndjson; charset=utf-8' );
        res.setHeader( 'Cache-Control', 'no-cache' );
        res.flushHeaders && res.flushHeaders();

        // Send progress
        const sendProgress = ( obj ) => {
            try { res.write( JSON.stringify( obj ) + '\n' ) }
            catch ( e ) { /* ignore */ }
        };

        try {

            const now = new Date();
            const fileExt = extname( req.file.originalname );

            // Create temp directory for hash check
            const tempFile = join( tmp, `temp_${ now.getTime() }${fileExt}` );

            await mkdir( tempDir, { recursive: true } );
            await writeFile( tempFile, req.file.buffer );

            // Calculate hash and check for duplicates
            const hash = await fileHash( tempFile );
            const existingId = await searchIndex.findByHash( hash );

            if ( existingId ) {

                await rm( tempFile );
                return res.json( {
                    success: false, duplicate: true,
                    message: req.t( 'error.upload.duplicate' ),
                    videoId: existingId
                } );

            }

            // Generate ids and prepare directories
            const videoId = generateId();
            const fileId = uuidv4();

            // Create video directory (contains all files for this video)
            const videoDir = join( media, videoId );
            const thumbDir = join( videoDir, 'thumb' );
            await mkdir( thumbDir, { recursive: true } );

            // Move temp file to final location
            const finalName = `${fileId}${fileExt}`;
            const finalPath = join( videoDir, finalName );

            await writeFile( finalPath, req.file.buffer );
            await rm( tempFile );

            sendProgress( {
                phase: 'saved', progress: 50,
                message: req.r( 'views.new.processing.msg.upload' )
            } );

        }

        catch { res.status( 500 ).json( { success: false, message: req.t( 'error.upload.processing' ) } ) }

    } );

}
