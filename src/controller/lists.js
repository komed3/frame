import { playlist } from '../utils/list.js';

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
