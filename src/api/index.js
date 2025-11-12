import express from 'express';
import { getPlaylist } from './list.js';
import { upload } from './upload.js';
import { video } from './video.js';

// Init express api
const api = express.Router();

// Handle routes
api.post( '/api/video/:id', video );
api.post( '/api/upload', upload );
api.post( '/api/list/:id', getPlaylist );

export { api };
