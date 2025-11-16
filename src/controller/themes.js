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
