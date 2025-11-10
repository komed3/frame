class VideoPlayer {

    constructor () {

        this.player = document.querySelector( '.player' );
        this.container = this.player.querySelector( '.player-container' );
        this.video = this.player.querySelector( 'video' );
        this.controls = this.player.querySelector( '.player-controls' );
        this.timecode = this.controls.querySelector( '.timecode' );

        this.actions = this.initActions();
        this.setActionState( {
            pause: false, replay: false,
            minimize: false, unmute: false
        } );

        this.overlay = {
            icon: this.player.querySelector( '.player-overlay .icon' ),
            msg: this.player.querySelector( '.player-overlay .msg' )
        };

        this.videoId = this.player.getAttribute( 'videoId' );
        this.videoDir = '/media/' + this.videoId + '/';
        this.videoData = {};

        this.loaded = false;
        this.ready = false;
        this.controlsTimeout = null;
        this.overlayTimeout = null;

        this.initEventHandlers();
        this.loadMeta().then( () => {
            this.loadState();
            this.saveState();
            this.initVideo();
            this.loadWaveform();
        } );

    }

    initActions () {

        const actions = {};

        this.controls.querySelectorAll( '[action]' ).forEach( el => {
            actions[ el.getAttribute( 'action' ) ] = el;
        } );

        return actions;

    }

    initEventHandlers () {

        // Mousemove
        this.container.addEventListener( 'mousemove', this.showControls.bind( this ) );
        this.container.addEventListener( 'mouseleave', this.hideControls.bind( this ) );

        // Play
        this.actions.interact.addEventListener( 'click', this.togglePlay.bind( this ) );
        this.actions.play.addEventListener( 'click', this.play.bind( this ) );
        this.actions.pause.addEventListener( 'click', this.pause.bind( this ) );
        this.actions.replay.addEventListener( 'click', this.play.bind( this ) );

        // Fullscreen
        document.addEventListener( 'fullscreenchange', this.updateFullscreenState.bind( this ) );
        this.container.addEventListener( 'dblclick', this.toggleFullscreen.bind( this ) );
        this.actions.maximize.addEventListener( 'click', this.maximize.bind( this ) );
        this.actions.minimize.addEventListener( 'click', this.minimize.bind( this ) );

        // Loading
        this.video.addEventListener( 'waiting', this.showLoad.bind( this ) );
        this.video.addEventListener( 'canplay', this.hideLoad.bind( this ) );
        this.video.addEventListener( 'playing', this.hideLoad.bind( this ) );

        // State
        this.video.addEventListener( 'play', this.updatePlayState.bind( this ) );
        this.video.addEventListener( 'play', this.hideControls.bind( this ) );
        this.video.addEventListener( 'pause', this.updatePlayState.bind( this ) );
        this.video.addEventListener( 'pause', this.showControls.bind( this ) );
        this.video.addEventListener( 'ended', this.updatePlayState.bind( this ) );
        this.video.addEventListener( 'ended', this.showControls.bind( this ) );

        // Buffering
        this.video.addEventListener( 'timeupdate', this.updateProgress.bind( this ) );
        this.video.addEventListener( 'loadedmetadata', this.updateTimeDisplay.bind( this ) );
        this.video.addEventListener( 'progress', this.updateBuffer.bind( this ) );

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

        const stream = new ReadableStream( { async pull ( controller ) {

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
        this.video.currentTime = this.videoState.progress || 0;
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

    setActionState ( states, classes = {} ) {

        for ( const [ action, state ] of Object.entries( states ) ) {
            this.actions[ action ].disabled = ! state;
        }

        for ( const [ cls, state ] of Object.entries( classes ) ) {

            if ( state ) this.player.classList.add( cls );
            else this.player.classList.remove( cls );

        }

    }

    showControls () {

        this.setActionState( {}, { controls: true } );
        clearTimeout( this.controlsTimeout );

        if ( ! this.video.paused ) this.controlsTimeout = setTimeout(
            this.hideControls.bind( this ), 3000
        );

    }

    hideControls() { this.setActionState( {}, { controls: this.video.paused } ) }

    showLoad () { this.setActionState( {}, { load: true } ) }

    hideLoad () { this.setActionState( {}, { load: false } ) }

    showOverlay ( icon, msg ) {

        this.overlay.msg.textContent = msg;
        this.overlay.icon.classList.remove( ...this.overlay.icon.classList );
        this.overlay.icon.classList.add( 'icon', 'icon-' + icon );

        this.setActionState( {}, { overlay: true } );
        clearTimeout( this.overlayTimeout );

        this.overlayTimeout = setTimeout(
            () => this.setActionState( {}, { overlay: false } ), 800
        );

    }

    updateProgress () {

        this.videoState.progress = this.video.currentTime || 0;
        this.saveState();

        const pct = ( this.video.currentTime / this.video.duration ) * 100;
        this.actions.seek.style.setProperty( '--progress', ( isNaN( pct ) ? 0 : pct ) + '%' );

        this.updateTimeDisplay();

    }

    updateBuffer () {

        if ( this.video.buffered.length > 0 ) {

            const bufferedEnd = this.video.buffered.end( this.video.buffered.length - 1 );
            const duration = this.video.duration;
            const pct = ( bufferedEnd / duration ) * 100;

            this.actions.seek.style.setProperty( '--buffered', ( isNaN( pct ) ? 0 : pct ) + '%' );

        }

    }

    updateTimeDisplay () {

        this.timecode.querySelector( '.cur' ).textContent = formatTime( this.video.currentTime );
        this.timecode.querySelector( '.dur' ).textContent = formatTime( this.video.duration );

    }

    // Play

    async play () { await this.video.play() }

    pause () { this.video.pause() }

    async togglePlay () {

        if ( this.video.paused ) await this.play();
        else this.pause();

    }

    updatePlayState () {

        const paused = this.video.paused;
        const ended = this.video.ended;

        this.setActionState(
            { play: paused && ! ended, pause: ! paused && ! ended, replay: ended },
            { play: ! paused, pause: paused, ended: ended }
        );

    }

    // Fullscreen

    isFullscreen () {

        return !! (
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement
        );

    }

    async maximize () {

        if ( this.isFullscreen() ) return;

        if ( this.container.requestFullscreen ) await this.container.requestFullscreen();
        else if ( this.container.webkitRequestFullscreen ) await this.container.webkitRequestFullscreen();
        else if ( this.container.mozRequestFullScreen ) await this.container.mozRequestFullScreen();

    }

    async minimize () {

        if ( ! this.isFullscreen() ) return;

        if ( document.exitFullscreen ) await document.exitFullscreen();
        else if ( document.webkitExitFullscreen ) await document.webkitExitFullscreen();
        else if ( document.mozCancelFullScreen ) await document.mozCancelFullScreen();

    }

    async toggleFullscreen () {

        if ( this.isFullscreen() ) await this.minimize();
        else await this.maximize();

    }

    updateFullscreenState () {

        const fs = this.isFullscreen();

        this.setActionState(
            { maximize: ! fs, minimize: fs },
            { fullscreen: fs }
        );

        if ( fs ) this.showOverlay( 'maximize', 'Video in full screen' );
        else this.showOverlay( 'minimize', 'Leave full screen' );

    }

}

// Initialize player when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoPlayer() );
