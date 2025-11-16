import { searchIndex } from '../utils/search.js';

export async function themes ( req, res ) {

    const categories = await searchIndex.getCategories();
    const videos = {};

    for ( const c of categories ) {
        videos[ c ] = await searchIndex.getVideos(
            ( await searchIndex.findByCategory( c ) ).slice( 0, 6 )
        );
    }

    res.render( 'themes', {
        title: req.t( 'views.themes.title' ),
        path: '/themes', template: 'themes',
        categories, videos
    } );

}

export async function theme ( req, res ) {

    const category = req.params.cat || '';
    const ids = await searchIndex.findByCategory( category );

    if ( ! ids ) { res.redirect( '/themes' ) } else {

        const videos = await searchIndex.getVideos( ids );

        res.render( 'theme', {
            title: req.t( 'category.' + category ),
            path: '/theme/' + category, template: 'theme',
            category, videos
        } );

    }

}
