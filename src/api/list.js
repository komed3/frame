import { playlist } from '../utils/list.js';

export async function getPlaylist ( req, res ) {

    const listId = req.params.id;
    const list = await playlist.getList( listId );

    if ( ! list ) return res.status( 404 ).json( { msg: 'List not found' } );
    return res.status( 200 ).json( { list } );

}
