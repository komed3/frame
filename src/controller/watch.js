import { playlist } from '../utils/list.js';
import { searchIndex } from '../utils/search.js';

export async function watch ( req, res ) {

    const videoId = req.params.id || '';
    const video = await searchIndex.getVideo( videoId );
    const list = await playlist.getList( req.query.list || '', true );
    const suggestions = await searchIndex.suggested( video );

    if ( ! video ) res.redirect( '/' );
    else res.render( 'watch', {
        title: video.title || videoId,
        path: '/watch/' + videoId, template: 'watch',
        videoId, video, list, suggestions
    } );

}
