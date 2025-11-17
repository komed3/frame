import { playlist } from '../utils/list.js';

export async function lists ( req, res ) {

    res.render( 'lists', {
        title: req.t( 'views.playlists.title' ),
        path: '/lists', template: 'lists',
        lists: await playlist.listIndex()
    } );

}

export async function list ( req, res ) {

    const listId = req.params.id || '';
    const list = await playlist.getList( listId, true );

    if ( ! list ) { res.redirect( '/lists' ) } else {

        res.render( 'list', {
            title: list.name,
            path: '/list/' + listId,
            template: 'list',
            listId, list
        } );

    }

}
