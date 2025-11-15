class VideoSearch {

    constructor () {

        this.form = document.querySelector( '.frame-search--form' );
        this.loader = document.querySelector( '.frame-search--loader' );
        this.results = document.querySelector( '.frame-search--results-grid' );
        this.empty = document.querySelector( '.frame-search--empty' );
        this.more = document.querySelector( '.frame-search--more' );

        this.query = null;
        this.offset = 0;

        this.initEventHandlers();

    }

    initEventHandlers () {

        this.form.addEventListener( 'submit', this.submit.bind( this ) );
        this.form.querySelectorAll( 'select' ).forEach( ( el ) =>
            el.addEventListener( 'change', this.submit.bind( this ) )
        );

    }

    async submit ( e ) {

        e.preventDefault();

        const formData = { ...Object.fromEntries( new FormData( this.form ) ), ...{ offset: this.offset } };
        if ( JSON.stringify( formData ) === JSON.stringify( this.query ) ) return;

        this.query = formData;
        this.loader.classList.remove( 'hidden' );
        this.more.classList.add( 'hidden' );

        const res = await fetch( '/api/search', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( this.query )
        } );

        if ( ! res.ok ) return;
        const { results, total, offset, limit } = await res.json();

        this.loader.classList.add( 'hidden' );
        this.empty.classList[ total === 0 ? 'remove' : 'add' ]( 'hidden' );
        this.more.classList[ total > offset + limit ? 'remove' : 'add' ]( 'hidden' );
        this.offset += limit;

        //

    }

}

// Initialize search when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoSearch() );
