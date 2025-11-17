const playAt = ( listId, videoId ) => location.href = `/watch/${videoId}?list=${listId}`;

const renameList = async ( listId ) => {

    await fetch( `/api/list/${listId}/rename`, {
        method: 'post',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify( {
            name: prompt( 'Playlist name:', 'Untitled' )
        } )
    } );

    location.reload();

}

const deleteList = async ( listId ) => {

    await fetch( `/api/list/${listId}/delete`, { method: 'post' } );
    location.reload();

}

document.addEventListener( 'DOMContentLoaded', function () {

    document.querySelectorAll( '[list][action="play"]' ).forEach( ( el ) =>
        el.addEventListener( 'click', () => playAt( el.getAttribute( 'list' ), el.getAttribute( 'at' ) ) )
    );

    document.querySelectorAll( '[list][action="delete"]' ).forEach( ( el ) =>
        el.addEventListener( 'click', () => deleteList( el.getAttribute( 'list' ) ) )
    );

    document.querySelectorAll( '[list][action="rename"]' ).forEach( ( el ) =>
        el.addEventListener( 'click', () => renameList( el.getAttribute( 'list' ) ) )
    );

} );
