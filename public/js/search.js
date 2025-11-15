class VideoSearch {

    constructor () {

        this.form = document.querySelector( '.frame-search--form' );
        this.empty = document.querySelector( '.frame-search--empty' );
        this.loader = document.querySelector( '.frame-search--loader' );
        this.results = document.querySelector( '.frame-search--results-grid' );
        this.more = document.querySelector( '.frame-search--more' );

        this.initEventHandlers();

    }

    initEventHandlers () {

        this.form.addEventListener( 'submit', this.handleSubmit.bind( this ) );

    }

    async handleSubmit ( e ) {

        e.preventDefault();
        e.stopImmediatePropagation();
        e.stopPropagation();

    }

}

// Initialize search when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoSearch() );
