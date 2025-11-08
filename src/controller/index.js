import express from 'express';
import { home } from './home.js';
import { upload } from './upload.js';
import { watch } from './watch.js';

// Init express router
const router = express.Router();

// Global vars
router.get( '/', ( req, res, next ) => {
    res.locals.lang = req.language;
    next();
} );

// Handle routes
router.get( '{/}', home );
router.get( '/watch/:id{/}', watch );
router.get( '/upload{/}', upload );

// Handle unknown paths
router.get( '/{*splat}', ( _, res ) => res.redirect( '/' ) );

export { router };
