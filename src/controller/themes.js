import { searchIndex } from '../utils/search.js';

export async function themes ( req, res ) {

    const categories = await searchIndex.getCategories();
    const videos = {};

    for ( const c of categories ) {

        const ids = await searchIndex.findByCategory( c );
        videos[ c ] = [];

        for( const v of ids.slice( 0, 12 ) ) {
            videos[ c ].push( await searchIndex.getVideo( v ) );
        }

    }

    res.render( 'themes', {
        title: req.t( 'views.themes.title' ),
        path: '/themes', template: 'themes',
        categories, videos
    } );

}

export async function theme ( req, res ) {

    const category = req.params.cat || '';
    const videos = await searchIndex.findByCategory( category );

    if ( ! videos ) { res.redirect( '/themes' ) } else {

        for( const [ i, v ] of Object.entries( videos.slice( 0, 48 ) ) ) {
            videos[ i ] = await searchIndex.getVideo( v );
        }

        res.render( 'theme', {
            title: req.t( 'category.' + category ),
            path: '/theme/' + category, template: 'theme',
            category, videos
        } );

    }

}
