import express from 'express';
import { upload } from './upload.js';

// Init express api
const api = express.Router();

// Handle routes
api.post( '/api/upload', upload );

export { api };
