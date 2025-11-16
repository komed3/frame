import { searchIndex } from '../utils/search.js';

export async function author ( req, res ) {

    const author = decodeURIComponent( req.params.author || '' );
    const ids = await searchIndex.findByAuthor( author );

    if ( ! ids ) { res.redirect( '/' ) } else {

        const videos = await searchIndex.getVideos( ids );

        res.render( 'author', {
            title: req.t( 'views.author.title', { author } ),
            path: '/author/' + req.params.author, template: 'author',
            author, videos
        } );

    }

}
