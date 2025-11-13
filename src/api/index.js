import express from 'express';
import { addToList, createList, deleteList, getPlaylist, removeFromList, renameList } from './list.js';
import { upload } from './upload.js';
import { video } from './video.js';

// Init express api
const api = express.Router();

// Handle routes
api.post( '/api/video/:id', video );
api.post( '/api/upload', upload );
api.post( '/api/list/new', createList );
api.post( '/api/list/:id', getPlaylist );
api.post( '/api/list/:id/add', addToList );
api.post( '/api/list/:id/rmv', removeFromList );
api.post( '/api/list/:id/rename', renameList );
api.post( '/api/list/:id/delete', deleteList );

export { api };
