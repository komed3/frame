import { playlist } from '../utils/list.js';

export async function getPlaylist ( req, res ) {

    const listId = req.params.id;
    const list = await playlist.getList( listId );

    if ( ! list ) return res.status( 404 ).json( { msg: 'List not found' } );
    return res.status( 200 ).json( { list } );

}

export async function createList ( req, res ) {

    const name = req.headers.name || 'Untitled';
    const videos = req.headers.videos.split( ',' ) || [];
    const { id, list } = await playlist.createList( name, videos );

    return res.status( 200 ).json( { id, list } );

}

export async function deleteList ( req, res ) {

    const listId = req.params.id;
    await playlist.deleteList( listId );

    return res.sendStatus( 200 );

}

export async function renameList ( req, res ) {

    const listId = req.params.id;
    const name = req.headers.name || 'Untitled';
    await playlist.renameList( listId, name );

    return res.sendStatus( 200 );

}

export async function addToList ( req, res ) {

    const listId = req.params.id;
    const videos = req.headers.videos.split( ',' ) || [];
    await playlist.addToList( listId, videos );

    return res.sendStatus( 200 );

}

export async function removeFromList ( req, res ) {

    const listId = req.params.id;
    const videos = req.headers.videos.split( ',' ) || [];
    await playlist.removeFromList( listId, videos );

    return res.sendStatus( 200 );

}
