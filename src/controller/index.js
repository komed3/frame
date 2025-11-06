import express from 'express';

// Init express router
const router = express.Router();

// Handle routes
router.get( '{/}', ( req, res ) => res.render( 'home', { title: req.t( 'views.home.title' ) } ) );

// Handle unknown paths
router.get( '/{*splat}', ( _, res ) => res.redirect( '/' ) );

export { router };
