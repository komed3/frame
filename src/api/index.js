import express from 'express';
import { addToList, createList, deleteList, getPlaylist, removeFromList, renameList } from './list.js';
import { search } from './search.js';
import { upload } from './upload.js';
import { rate, video } from './video.js';

// Init express api
const api = express.Router();

// Language selector
api.get( '/api/lang/:lang', ( req, res ) => {
    req.i18n.changeLanguage( req.params.lang );
    res.redirect( req.get( 'Referrer' ) );
} );

// Handle routes
api.post( '/api/video/:id', video );
api.post( '/api/list/new', createList );
api.post( '/api/list/:id', getPlaylist );
api.post( '/api/list/:id/add', addToList );
api.post( '/api/list/:id/rmv', removeFromList );
api.post( '/api/list/:id/rename', renameList );
api.post( '/api/list/:id/delete', deleteList );
api.post( '/api/rate/:id', rate );
api.post( '/api/search', search );
api.post( '/api/upload', upload );

export { api };
