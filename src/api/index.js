import express from 'express';
import { addToList, createList, deleteList, getPlaylist, removeFromList, renameList } from './list.js';
import { search } from './search.js';
import { upload } from './upload.js';
import { dislike, like, video } from './video.js';

// Init express api
const api = express.Router();

// Handle routes
api.post( '/api/video/:id', video );
api.post( '/api/list/new', createList );
api.post( '/api/list/:id', getPlaylist );
api.post( '/api/list/:id/add', addToList );
api.post( '/api/list/:id/rmv', removeFromList );
api.post( '/api/list/:id/rename', renameList );
api.post( '/api/list/:id/delete', deleteList );
api.post( '/api/like/:id', like );
api.post( '/api/dislike/:id', dislike );
api.post( '/api/search', search );
api.post( '/api/upload', upload );

export { api };
