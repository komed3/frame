import { playlist } from '../utils/list.js';
import { searchIndex } from '../utils/search.js';

export async function watch ( req, res ) {

    const videoId = req.params.id || '';
    const video = await searchIndex.getVideo( videoId );

    if ( ! video ) { res.redirect( '/' ) } else {

        await searchIndex.addView( videoId );
        await searchIndex.addHistory( videoId );

        const list = await playlist.getList( req.query.list || '', true );
        const playlists = await playlist.listIndex( videoId );
        const isInPlaylist = playlists.some( p => p.selected );
        const suggestions = await searchIndex.suggested( video );

        res.render( 'watch', {
            title: video.title || videoId,
            path: '/watch/' + videoId, template: 'watch',
            videoId, video, list, suggestions,
            playlists, isInPlaylist
        } );

    }

}
