import { createPreview, createWaveform, extractMeta } from './utils/analyseVideo.js';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
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
    limits: { fileSize: 10 * 1024 * 1024 * 1024 },
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
        const sendProgress = o => { try { res.write( JSON.stringify( o ) + '\n' ) } catch ( e ) { /* ignore */ } };

    } );

} );

export { api };
