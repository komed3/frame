const deleteList = async ( listId ) => {

    await fetch( `/api/list/${listId}/delete`, { method: 'post' } );
    location.reload();

}

document.addEventListener( 'DOMContentLoaded', function () {

    document.querySelectorAll( '[list][action="delete"]' ).forEach( ( el ) =>
        el.addEventListener( 'click', () => deleteList( el.getAttribute( 'list' ) ) )
    );

} );
