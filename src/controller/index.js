import { home } from './home.js';
import { form } from './upload.js';
import { watch } from './watch.js';
import express from 'express';

// Init express router
const router = express.Router();

// Setup routes
const routes = [
    { path: '{/}', get: home },
    { path: '/watch/:id{/}', get: watch },
    { path: '/upload{/}', get: form }
];

// Routing paths
routes.forEach( ( route ) => {

    const { path, get, post } = route;

    if ( post ) router.post( path, post );
    if ( get ) router.get( path, get );

} );

// Handle unknown paths
router.get( '/{*splat}', ( _, res ) => res.redirect( '/' ) );

export { routes, router };
