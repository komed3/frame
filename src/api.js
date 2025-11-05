import { analyseVideo } from './utils/analyseVideo.js';
import { mkdir, writeFile, rename } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import ShortUniqueId from 'short-unique-id';

// Init ID generator
const uid = new ShortUniqueId( {
    dictionary: 'alphanum',
    length: 10
} );

// Init express router
const api = express.Router();

// Proceed video upload
api.post( '/api/upload', ( req, res ) => {

    //

} );

export { api };
