import { createPreview, createWaveform, extractMeta, calculateHash } from './utils/analyseVideo.js';
import { searchIndex } from './utils/searchIndex.js';
import { mkdir, writeFile, rm } from 'node:fs/promises';
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
    limits: { fileSize: 5 * 1024 * 1024 * 1024 },
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

            const now = new Date();
            const fileExt = extname( req.file.originalname );

            // Create temp directory for hash check
            const tempDir = join( process.cwd(), 'temp' );
            const tempFile = join( tempDir, `temp_${ now.getTime() }${fileExt}` );

            await mkdir( tempDir, { recursive: true } );
            await writeFile( tempFile, req.file.buffer );

            // Calculate hash and check for duplicates
            const hash = await calculateHash( tempFile );
            const existingId = await searchIndex.findByHash( hash );

            if ( existingId ) {

                await rm( tempFile );
                return res.json( {
                    success: false, duplicate: true,
                    message: 'Video already exists',
                    videoId: existingId
                } );

            }

            // Generate ids and prepare directories
            const videoId = uid.rnd();
            const fileId = uuidv4();

            // Create video directory (contains all files for this video)
            const videoDir = join( process.cwd(), 'media', videoId );
            await mkdir( videoDir, { recursive: true } );

            // Move temp file to final location
            const finalName = `${fileId}${fileExt}`;
            const finalPath = join( videoDir, finalName );

            await writeFile( finalPath, req.file.buffer );
            await rm( tempFile );

            sendProgress( { phase: 'saved', progress: 50, message: 'File saved on server' } );

            // Extract metadata and analyze video
            const meta = await extractMeta( finalPath );
            sendProgress( { phase: 'meta', progress: 60, message: 'Metadata extracted' } );

            // Generate waveform
            const waveform = await createWaveform( finalPath, meta, 150 );
            sendProgress( { phase: 'waveform', progress: 75, message: 'Waveform generated' } );

            // Generate previews (thumbnails every X seconds)
            const { thumbnails, poster } = await createPreview( finalPath, videoDir, fileId, meta );
            sendProgress( { phase: 'preview', progress: 95, message: 'Thumbnails generated' } );

            // Prepare video record with search-relevant data
            const searchData = {
                category: req.body.category || '',
                title: req.body.title || '',
                author: req.body.author || '',
                source: req.body.source || '',
                tags: req.body.tags ? req.body.tags.split( ',' ).map( t => t.trim() ).filter( Boolean ) : [],
            };

            const videoRecord = {
                videoId, fileId, hash,
                fileName: finalName,
                created: now.toISOString(),
                meta, waveform, thumbnails, poster,
                content: {
                    ...searchData,
                    description: req.body.description || '',
                    lang: req.body.lang || ''
                }
            };

            // Add to search index
            await searchIndex.addVideo( videoId, {
                ...searchData, hash, poster,
                duration: meta.duration,
                created: now.toISOString()
            } );

            // Save JSON
            await writeFile( join( videoDir, 'video.json' ), JSON.stringify( videoRecord, null, 2 ) );
            sendProgress( { phase: 'done', progress: 100, message: 'Processing complete', videoId } );

            // End stream
            res.end();

        } catch ( e ) {

            res.status( 500 ).json( {
                success: false, e,
                message: 'Processing error'
            } );

        }

    } );

} );

export { api };
