import { searchIndex } from '../utils/search.js';

export async function tag ( req, res ) {

    const tag = decodeURIComponent( req.params.tag || '' );
    const ids = await searchIndex.findByTag( tag );

    if ( ! ids ) { res.redirect( '/' ) } else {

        const videos = await searchIndex.getVideos( ids );

        res.render( 'tag', {
            title: req.t( 'views.tag.title', { tag } ),
            path: '/tag/' + req.params.tag, template: 'tag',
            tag, videos
        } );

    }

}
