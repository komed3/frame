import { api } from './api.js';
import { router } from './controller/index.js';
import { join } from 'node:path';
import express, { static as serveStatic } from 'express';

const cwd = process.cwd();

// Initialize express app
const app = express();

// Set view engine
app.set( 'views', join( cwd, 'views' ) );
app.set( 'view engine', 'pug' );

// Middlewares
app.use( express.urlencoded( { extended: true } ) );
app.use( express.json() );

// Serve static files
app.use( '/fonts', serveStatic( join( cwd, 'public/fonts' ) ) );
app.use( '/images', serveStatic( join( cwd, 'public/images' ) ) );
app.use( '/css', serveStatic( join( cwd, 'public/css' ) ) );
app.use( '/js', serveStatic( join( cwd, 'public/js' ) ) );
app.use( '/media', serveStatic( join( cwd, 'media' ) ) );

// API and Mount router
app.use( api );
app.use( router );

// App listen on port
app.listen( process.env.PORT || 3000, () => console.log( 'Server is running!' ) );
