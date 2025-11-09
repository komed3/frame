class VideoPlayer {

    constructor () {

        this.player = document.querySelector( '.player' );
        this.video = this.player.querySelector( 'video' );
        this.controls = this.player.querySelector( '.player-controls' );

        this.videoId = this.player.getAttribute( 'videoId' );
        this.videoDir = '/media/' + this.videoId + '/';
        this.videoData = {};

        this.loaded = false;
        this.ready = false;

        this.loadMeta().then( () => {
            this.loadState();
            this.saveState();
            this.initVideo();
            this.loadWaveform();
        } );

    }

    async loadMeta () {

        if ( this.loaded ) return;

        try {

            const res = await fetch( '/api/video/' + this.videoId, {
                method: 'post', headers: { 'Content-Type': 'application/json' }
            } );

            if ( ! res.ok ) throw new Error( 'Error fetching video data' );

            this.videoData = await res.json();
            this.loaded = true;

        } catch ( err ) { throw new Error( err ) }

    }

    loadState () {

        this.playerState = JSON.parse( localStorage.getItem( '__player__' ) ?? '{ "volume": 1, "playbackRate": 1 }' );
        this.videoState = JSON.parse( localStorage.getItem( this.videoId ) ?? '{ "progress": 0 }' );

    }

    saveState () {

        localStorage.setItem( '__player__', JSON.stringify( this.playerState ) );
        localStorage.setItem( this.videoId, JSON.stringify( this.videoState ) );

    }

    async stream () {

        if ( this.ready ) return;

        const chunkSize = 512 * 1024;
        const res = await fetch( this.videoDir + this.videoData.fileName );
        const reader = res.body.getReader();

        const stream = new ReadableStream( { async pull( controller ) {

            let { done, value } = await reader.read();
            if ( done ) return controller.close();

            for ( let i = 0; i < value.length; i += chunkSize ) controller.enqueue(
                value.slice( i, i + chunkSize )
            );

        } } );

        const blob = await new Response( stream ).blob();
        const blobUrl = URL.createObjectURL( blob );
        this.video.src = blobUrl;

    }

    async initVideo () {

        if ( this.ready ) return;
        if ( ! this.loaded ) await this.loadMeta();

        await this.stream();

        this.video.poster = this.videoDir + 'poster.jpg';
        this.video.load();

        this.ready = true;
        this.hideLoad();

    }

    async loadWaveform () {

        if ( ! this.loaded ) await this.loadMeta();

        const canvas = this.controls.querySelector( '.waveform' );
        const ctx = canvas.getContext( '2d', { alpha: true } );
        const data = this.videoData.waveform || [];
        const baseColor = 'rgba( 255 255 255 / 0.2 )';
        const progColor = 'rgba( 224 47 47 / 0.6 )';

        let bars = [], layout;

        const drawRect = ( v, i ) => {

            const { h, barWidth } = layout;
            const x = i * barWidth;
            const y = h - v / 100 * h;

            ctx.fillRect( x, y, barWidth * 0.8, v / 100 * h );

        }

        const redraw = () => {

            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth * dpr;
            const h = canvas.clientHeight * dpr;

            if ( canvas.width !== w || canvas.height !== h ) canvas.width = w, canvas.height = h;

            const maxBars = Math.min( data.length, Math.floor( w / 3 ) );
            const step = data.length / maxBars;

            bars = Array.from( { length: maxBars }, ( _, i ) =>
                Math.max( ...data.slice( Math.floor( i * step ), Math.floor( ( i + 1 ) * step ) ) )
            );

            layout = { w, h, barWidth: w / bars.length };
            drawProgress();

        };

        const drawProgress = () => {

            const { w, h } = layout;
            const progress = this.video.currentTime / this.video.duration;
            const cutoff = Math.floor( bars.length * progress );

            ctx.clearRect( 0, 0, w, h );

            // Base waveform
            ctx.fillStyle = baseColor;
            bars.forEach( drawRect );

            // Progress
            ctx.fillStyle = progColor;
            bars.slice( 0, cutoff ).forEach( drawRect );

        };

        new ResizeObserver( redraw ).observe( canvas );
        this.video.addEventListener( 'timeupdate', drawProgress );

        redraw();

    }

    showLoad () { this.player.classList.add( 'load' ) }

    hideLoad () { this.player.classList.remove( 'load' ) }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
