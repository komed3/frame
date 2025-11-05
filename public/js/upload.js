class VideoUploader {

    constructor () {

        this.container = document.querySelector( '.upload-container' );
        this.dropArea = this.container.querySelector( '.file-drop-area' );
        this.fileInput = this.container.querySelector( '[name="video"]' );
        this.preview = this.container.querySelector( '.video-preview' );
        this.previewPlayer = this.preview.querySelector( '.preview-player' );
        this.error = this.container.querySelector( '.upload-error' );
        this.progress = this.container.querySelector( '.upload-progress' );
        this.actions = this.container.querySelector( '.form-actions' );

        this.initEventHandlers();

    }

    initEventHandlers () {

        // Drag and drop events
        [ 'dragenter', 'dragover', 'dragleave', 'drop' ].forEach( event => {

            this.dropArea.addEventListener( event, e => {
                e.preventDefault();
                e.stopImmediatePropagation();
                e.stopPropagation();
            } );

        } );

        [ 'dragenter', 'dragover' ].forEach( event => {

            this.dropArea.addEventListener( event, () => {
                this.dropArea.classList.add( 'dragover' );
            } );

        } );

        [ 'dragleave', 'drop' ].forEach( event => {

            this.dropArea.addEventListener( event, () => {
                this.dropArea.classList.remove( 'dragover' );
            } );

        } );

        // Handle file selection
        this.dropArea.addEventListener( 'drop', e => this.handleFileSelect( e.dataTransfer.files[ 0 ] ) );
        this.fileInput.addEventListener( 'change', e => this.handleFileSelect( e.target.files[ 0 ] ) );
        this.container.querySelector( '.change-video' ).addEventListener( 'click', () => location.reload() );

        // Form submission
        this.container.addEventListener( 'submit', e => {

            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();

            this.handleUpload();

        } );

    }

    handleFileSelect ( file ) {

        if ( ! file || ! file.type.startsWith( 'video/' ) ) {
            this.showError( 'Wrong file type! Video formats only.' );
            return;
        }

        const info = this.preview.querySelector( '.file-info' );
        info.querySelector( '.name' ).textContent = file.name;
        info.querySelector( '.size' ).textContent = formatFileSize( file.size );

        // Create video preview
        const videoURL = URL.createObjectURL( file );
        this.previewPlayer.src = videoURL;
        this.previewPlayer.load();

        this.dropArea.classList.add( 'hidden' );
        this.preview.classList.remove( 'hidden' );
        this.error.classList.add( 'hidden' );

    }

    showError ( message ) {

        this.error.classList.remove( 'hidden' );
        this.error.querySelector( '.message' ).textContent = message;

    }

    handleServerLine ( obj ) {

        // obj is parsed JSON from server (NDJSON)
        if ( ! obj || typeof obj !== 'object' ) return;

        const msg = obj.message || '';
        const progress = typeof obj.progress === 'number' ? Math.min( 100, Math.max( 0, obj.progress ) ) : null;

        // Show server-side processing progress and status message
        if ( progress !== null ) {

            this.progress.style.setProperty( '--progress', progress + '%' );
            this.progress.querySelector( '.status-text .right' ).textContent = Math.round( progress ) + '%';

        }

        if ( msg ) this.statusText.querySelector( '.status-text .left' ).textContent = msg;

        // If processing is done, redirect to video page after short delay
        if ( obj.phase === 'done' && obj.videoId ) setTimeout(
            () => location.href = `/watch/${obj.videoId}`, 400
        );

    }

    async handleUpload () {

        const formData = new FormData( this.container );

        this.progress.classList.remove( 'hidden' );
        this.error.classList.add( 'hidden' );
        this.actions.classList.add( 'hidden' );

        try {}
        catch {}

    }

}

// Initialize uploader when DOM is loaded
document.addEventListener( 'DOMContentLoaded', () => new VideoUploader() );
