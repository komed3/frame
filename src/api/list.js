import { playlist } from '../utils/list.js';

export async function getPlaylist ( req, res ) {

    const listId = req.params.id;
    const list = await playlist.getList( listId );

    if ( ! list ) return res.status( 404 ).json( { msg: 'List not found' } );
    return res.status( 200 ).json( { list } );

}

export async function createList ( req, res ) {

    try {

        const name = req.body.name || 'Untitled';
        const videos = req.body.videos || [];
        const { id, list } = playlist.createList( name, videos );

        return res.status( 200 ).json( { id, list } );

    }

    catch { return res.sendStatus( 500 ) }

}

export async function deleteList ( req, res ) {

    try {
        await playlist.deleteList( req.params.id );
        return res.sendStatus( 200 );
    }

    catch { return res.sendStatus( 500 ) }

}

export async function renameList ( req, res ) {

    try {
        await playlist.renameList( req.params.id, req.body.name || 'Untitled' );
        return res.sendStatus( 200 );
    }

    catch { return res.sendStatus( 500 ) }

}

export async function addToList ( req, res ) {

    try {
        await playlist.addToList( req.params.id, req.body.videos || [] );
        return res.sendStatus( 200 );
    }

    catch { return res.sendStatus( 500 ) }

}

export async function removeFromList ( req, res ) {

    try {
        await playlist.removeFromList( req.params.id, req.body.videos || [] );
        return res.sendStatus( 200 );
    }

    catch { return res.sendStatus( 500 ) }

}
