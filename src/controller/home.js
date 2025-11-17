import { playlist } from '../utils/list.js';
import { searchIndex } from '../utils/search.js';

export async function home ( req, res ) {

    const stats = await searchIndex.getStats();
    const history = await searchIndex.getVideos( await searchIndex.getHistory( 6, true ) );
    const lists = ( await playlist.listIndex() ).slice( 0, 6 );
    const { results: newest } = await searchIndex.search( '', { limit: 6 } );

    res.render( 'home', {
        title: req.t( 'views.home.title' ),
        path: '/', template: 'home',
        stats, history, lists, newest
    } );

}
