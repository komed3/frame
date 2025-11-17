import express from 'express';
import { author } from './author.js';
import { home } from './home.js';
import { list, lists } from './lists.js';
import { search } from './search.js';
import { tag } from './tag.js';
import { theme, themes } from './themes.js';
import { upload } from './upload.js';
import { watch } from './watch.js';

// Init express router
const router = express.Router();

// Handle routes
router.get( '{/}', home );
router.get( '/search{/}', search );
router.get( '/themes{/}', themes );
router.get( '/theme/:cat{/}', theme );
router.get( '/tag/:tag{/}', tag );
router.get( '/author/:author{/}', author );
router.get( '/watch/:id{/}', watch );
router.get( '/lists{/}', lists );
router.get( '/list/:id{/}', list );
router.get( '/upload{/}', upload );

// Handle unknown paths
router.get( '/{*splat}', ( _, res ) => res.redirect( '/' ) );

export { router };
