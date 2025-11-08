import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { media, tmp } from '../utils/config.js';
import { searchIndex } from '../utils/search.js';
import { createPreview, createThumbnail, fileHash, fileMeta, generateId, getWaveform, uploadVideo } from '../utils/video.js';

export async function upload ( req, res ) {

    uploadVideo( req, res, async ( err ) => {

        // Error while uploading
        if ( err ) return res.status( 400 ).json( { success: false, msg: req.t( 'error.upload.upload', { msg: err.message } ) } );
        if ( ! req.file ) return res.status( 400 ).json( { success: false, msg: req.t( 'error.upload.noFile' ) } );

        // Prepare streaming (send NDJSON lines)
        res.setHeader( 'Content-Type', 'application/x-ndjson; charset=utf-8' );
        res.setHeader( 'Cache-Control', 'no-cache' );
        res.flushHeaders && res.flushHeaders();

        // Send progress
        const sendProgress = ( obj ) => {
            try { res.write( JSON.stringify( { ...{ success: true }, ...obj } ) + '\n' ) }
            catch ( e ) { /* ignore */ }
        };

        try {

            const now = new Date();
            const fileExt = extname( req.file.originalname );

            // Create tmp directory for hash check
            const tmpFile = join( tmp, `tmp_${ now.getTime() }${fileExt}` );

            await mkdir( tmp, { recursive: true } );
            await writeFile( tmpFile, req.file.buffer );

            // Calculate hash and check for duplicates
            const hash = await fileHash( tmpFile );
            const existingId = await searchIndex.findByHash( hash );

            if ( existingId ) {
                await rm( tmpFile );
                sendProgress( { success: false, duplicate: true, msg: req.t( 'error.upload.duplicate' ) } );
                return res.end();
            }

            // Generate ids and prepare directories
            const videoId = await generateId();
            const fileId = uuidv4();

            // Create video directory (contains all files for this video)
            const videoDir = join( media, videoId );
            const thumbDir = join( videoDir, 'thumb' );
            await mkdir( thumbDir, { recursive: true } );

            // Move tmp file to final location
            const finalName = `${fileId}${fileExt}`;
            const finalPath = join( videoDir, finalName );
            await rename( tmpFile, finalPath );
            sendProgress( { phase: 'saved', progress: 50, msg: req.t( 'views.upload.processing.msg.upload' ) } );

            // Extract metadata and analyze video
            const meta = await fileMeta( finalPath );
            sendProgress( { phase: 'meta', progress: 60, msg: req.t( 'views.upload.processing.msg.meta' ) } );

            // Generate waveform
            const waveform = await getWaveform( finalPath, meta );
            sendProgress( { phase: 'waveform', progress: 75, msg: req.t( 'views.upload.processing.msg.waveform' ) } );

            // Create video thumbnail (poster)
            await createThumbnail( finalPath, videoDir, meta );
            sendProgress( { phase: 'thumbnail', progress: 80, msg: req.t( 'views.upload.processing.msg.thumbnail' ) } );

            // Generate previews (thumbnails every X seconds)
            const preview = await createPreview( finalPath, thumbDir, meta );
            sendProgress( { phase: 'preview', progress: 95, msg: req.t( 'views.upload.processing.msg.preview' ) } );

            // Prepare video record with search-relevant data
            const searchData = {
                title: req.body.title || '',
                author: req.body.author || '',
                source: req.body.source || '',
                date: req.body.date || '',
                lang: req.body.lang || '',
                description: req.body.description || '',
                category: req.body.category || '',
                pg: req.body.pg || '',
                tags: req.body.tags ? req.body.tags.split( ',' ).map( t => t.trim() ).filter( Boolean ) : [],
            };

            const videoRecord = {
                videoId, fileId, hash,
                fileName: finalName,
                mimeType: req.file.mimetype,
                created: now.toISOString(),
                content: searchData,
                meta, waveform, preview
            };

            // Add to search index
            await searchIndex.addVideo( videoId, {
                ...searchData, hash,
                duration: meta.duration,
                created: now.toISOString()
            } );

            // Save JSON
            await writeFile( join( videoDir, 'video.json' ), JSON.stringify( videoRecord, null, 2 ) );
            sendProgress( { phase: 'done', progress: 100, msg: req.t( 'views.upload.processing.msg.done' ), videoId } );

            // End stream
            res.end();

        }

        catch ( error ) {
            sendProgress( { success: false, msg: req.t( 'error.upload.processing' ) } );
            res.end();
        }

    } );

}
