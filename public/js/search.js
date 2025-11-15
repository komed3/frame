class VideoSearch {

    constructor () {

        this.form = document.querySelector( '.frame-search--form' );
        this.empty = document.querySelector( '.frame-search--empty' );
        this.results = document.querySelector( '.frame-search--results-grid' );
        this.more = document.querySelector( '.frame-search--more' );

    }

}

// Initialize search when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoSearch() );
