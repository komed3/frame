import express from 'express';

// Init express router
const router = express.Router();

// Global vars
router.get( '/', ( req, res, next ) => {
    res.locals.lang = req.language;
    next();
} );

// Handle routes
router.get( '{/}', ( req, res ) => res.render( 'home', {
    title: req.t( 'views.home.title' ),
    path: '/', template: 'home'
} ) );

router.get( '/upload{/}', ( req, res ) => res.render( 'upload', {
    title: req.t( 'views.upload.title' ),
    path: '/upload', template: 'new'
} ) );

// Handle unknown paths
router.get( '/{*splat}', ( _, res ) => res.redirect( '/' ) );

export { router };
