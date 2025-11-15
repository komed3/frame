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
        this.loadFromUrl();

    }

    initEventHandlers () {

        // Form actions
        this.form.addEventListener( 'submit', this.submit.bind( this ) );
        this.form.querySelectorAll( 'select' ).forEach( ( el ) =>
            el.addEventListener( 'change', this.submit.bind( this ) )
        );

        // Load more
        this.more.querySelector( 'button' ).addEventListener( 'click', () => {
            this.query.offset = this.offset;
            this.search();
        } );

    }

    async loadFromUrl () {

        //

    }

    addVideo ( video ) {

        if ( ! video || ! video.id ) return;

        const el = document.createElement( 'a' );
        el.classList.add( 'frame-videogrid--item' );
        el.href = '/watch/' + video.id;
        el.setAttribute( 'title', video.title );
        el.setAttribute( 'video', video.id );

        const { progress } = JSON.parse( localStorage.getItem( video.id ) ?? '{"progress":0}' );
        el.style.setProperty( '--progress', progress + '%' );

        el.innerHTML =
            `<img class="frame-videogrid--item-preview" src="/media/${video.id}/${video.thumbnail}" alt= "Thumbnail" />` +
            `<div class="frame-videogrid--item-overlay">` +
                `<span>${video.title}</span>` +
                `<time>${ formatTime( video.duration ) }</time>` +
            `</div>` +
            `<div class="frame-videogrid--item-progress"></div>`;

        this.results.appendChild( el );

    }

    async search () {

        this.queryUrl = new URLSearchParams( this.query ).toString();
        window.history.pushState( '', '', '/search/?' + this.queryUrl );

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

        this.offset = offset + limit;
        if ( offset === 0 ) this.results.innerHTML = '';
        results.forEach( v => this.addVideo( v ) );

    }

    async submit ( e ) {

        e.preventDefault();

        const formData = Object.fromEntries( new FormData( this.form ) );
        if ( JSON.stringify( formData ) === JSON.stringify( this.query ) ) return;

        this.query = formData;
        this.search();

    }

}

// Initialize search when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoSearch() );
