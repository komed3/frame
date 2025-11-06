import express from 'express';
import { home } from './home.js';

// Init express router
const router = express.Router();

// Setup routes
const routes = [
    { path: '{/}', get: home }
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
