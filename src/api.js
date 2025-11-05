import { createPreview, createWaveform, extractMeta } from './utils/analyseVideo.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import ShortUniqueId from 'short-unique-id';

// Init ID generator
const uid = new ShortUniqueId( { dictionary: 'alphanum', length: 10 } );

// Init express router
const api = express.Router();

// Init multer upload
const upload = multer( {
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    fileFilter: ( _, file, cb ) => {

        if ( file.mimetype && file.mimetype.startsWith( 'video/' ) ) cb( null, true );
        else cb( new Error( 'Invalid file type' ) );

    }
} ).single( 'video' );

// Proceed video upload
api.post( '/api/upload', ( req, res ) => {

    upload( req, res, async ( err ) => {

        if ( err ) return res.status( 400 ).json( { success: false, message: err.message } );
        if ( ! req.file ) return res.status( 400 ).json( { success: false, message: 'No file uploaded.' } );

        // Prepare streaming (send NDJSON lines)
        res.setHeader( 'Content-Type', 'application/x-ndjson; charset=utf-8' );
        res.setHeader( 'Cache-Control', 'no-cache' );
        res.flushHeaders && res.flushHeaders();

        // Send progress
        const sendProgress = o => {
            try { res.write( JSON.stringify( o ) + '\n' ) }
            catch ( e ) { /* ignore */ }
        };

        try {

            // Generate ids
            const videoId = uid.rnd();
            const fileId = uuidv4();

            // Create directories
            const mediaDir = join( process.cwd(), 'media', videoId );
            const dataDir = join( process.cwd(), 'data', videoId );
            await mkdir( mediaDir, { recursive: true } );
            await mkdir( dataDir, { recursive: true } );

            // Save uploaded file under safe uuid name
            const ext = extname( req.file.originalname );
            const fileName = `${ fileId }${ ext }`;
            const filePath = join( mediaDir, fileName );

            // Write file
            await writeFile( filePath, req.file.buffer );
            sendProgress( { phase: 'saved', progress: 40, message: 'File saved on server' } );

            // Extract metadata
            const meta = await extractMeta( filePath );
            sendProgress( { phase: 'meta', progress: 50, message: 'Metadata extracted' } );

            // Generate waveform
            const waveform = await createWaveform( filePath, 150 );
            sendProgress( { phase: 'waveform', progress: 65, message: 'Waveform generated' } );

            // Generate previews (thumbnails every X seconds)
            const thumbnails = await createPreview( filePath, mediaDir, fileId, 5 );
            sendProgress( { phase: 'preview', progress: 90, message: 'Thumbnails generated' } );

            // Prepare video record
            const videoRecord = {
                videoId, fileId, fileName,
                created: new Date().toISOString(),
                meta, waveform, thumbnails,
                content: {
                    title: req.body.title || '',
                    author: req.body.author || '',
                    source: req.body.source || '',
                    description: req.body.description || '',
                    category: req.body.category || '',
                    tags: req.body.tags ? req.body.tags.split( ',' ).map( t => t.trim() ).filter( Boolean ) : [],
                }
            };

            // Save JSON
            await writeFile( join( dataDir, 'video.json' ), JSON.stringify( videoRecord, null, 2 ) );
            sendProgress( { phase: 'done', progress: 100, message: 'Processing complete', videoId } );

            // End stream
            res.end();

        } catch ( e ) {

            res.status( 500 ).json( { success: false, message: 'Processing error', e } );

        }

    } );

} );

export { api };
