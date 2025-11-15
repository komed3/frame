class VideoSearch {

    constructor () {

        this.form = document.querySelector( '.frame-search--form' );
        this.empty = document.querySelector( '.frame-search--empty' );
        this.loader = document.querySelector( '.frame-search--loader' );
        this.results = document.querySelector( '.frame-search--results-grid' );
        this.more = document.querySelector( '.frame-search--more' );

        this.query = null;

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

        const formData = Object.fromEntries( Array.from( new FormData( this.form ) ) );
        if ( JSON.stringify( formData ) === JSON.stringify( this.query ) ) return;

        this.query = formData;

        const res = await fetch( '/api/search', {
            method: 'post',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify( this.query )
        } );

        if ( ! res.ok ) return;
        const {} = await res.json();

    }

}

// Initialize search when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoSearch() );
