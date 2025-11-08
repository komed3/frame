class VideoUploader {

    constructor () {

        this.form = document.querySelector( '.frame-upload' );
        this.dropArea = this.form.querySelector( '.frame-upload--file-drop' );
        this.fileInput = this.dropArea.querySelector( 'input' );
        this.preview = this.form.querySelector( '.frame-upload--file-preview' );
        this.video = this.preview.querySelector( 'video' );
        this.fileInfo = this.form.querySelector( '.frame-upload--file-info' );
        this.progressIndicator = this.form.querySelector( '.frame-upload--progress-indicator' );
        this.progressLabel = this.form.querySelector( '.frame-upload--progress-label' );
        this.progressMessage = this.form.querySelector( '.frame-upload--progress-message' );
        this.errorMsg = this.form.querySelector( '.frame-upload--error-message' );

        this.isUploading = false;
        this.errorTimeout = null;

        this.initEventListener();

    }

    initEventListener () {

        // File upload
        this.fileInput.addEventListener( 'change', this.handleFileSelect.bind( this ) );
        this.preview.querySelector( '.change-file' ).addEventListener( 'click', this.clearFileSelect.bind( this ) );

        // Form actions
        this.form.addEventListener( 'submit', this.submit.bind( this ) );
        this.form.addEventListener( 'reset', this.reset.bind( this ) );

        // Prevent page exit
        window.addEventListener( 'beforeunload', e => {
            if ( this.isUploading ) { e.preventDefault(); return; }
        } );

    }

    handleFileSelect ( e ) {

        const file = e.target.files[ 0 ];

        if ( ! file || ! file.type.startsWith( 'video/' ) ) return;

        // Show preview
        this.video.src = URL.createObjectURL( file );
        this.video.load();
        this.dropArea.classList.add( 'hidden' )
        this.preview.classList.remove( 'hidden' );

        // Get file meta
        this.fileInfo.querySelector( '.name' ).textContent = file.name;
        this.fileInfo.querySelector( '.size' ).textContent = formatFileSize( file.size );
        this.fileInfo.querySelector( '.type' ).textContent = file.type;

        // Get video meta
        this.video.addEventListener( 'loadedmetadata', () => {
            this.fileInfo.querySelector( '.duration' ).textContent = formatTime( this.video.duration );
            this.fileInfo.querySelector( '.resolution' ).textContent = `${this.video.videoWidth}px × ${this.video.videoHeight}px`;
        } );

    }

    clearFileSelect () {

        this.fileInput.value = '';

        // Clear video preview
        this.video.src = '';
        this.video.load();

        // Hide preview
        this.dropArea.classList.remove( 'hidden' );
        this.preview.classList.add( 'hidden' );

        // Reset file meta
        this.fileInfo.querySelectorAll( 'strong' ).forEach( el => el.textContent = '—' );

    }

    showError ( msg ) {

        this.form.classList.remove( 'processing' );
        this.form.classList.add( 'error' );
        this.errorMsg.textContent = msg;

        clearTimeout( this.errorTimeout );
        this.errorTimeout = setTimeout( () => {
            this.form.classList.remove( 'processing', 'error' );
            this.isUploading = false;
        }, 2500 );

    }

    handleServerLine ( obj ) {

        // obj is parsed JSON from server (NDJSON)
        if ( ! obj || typeof obj !== 'object' ) return;

        const msg = obj.msg || '';
        const pct = typeof obj.progress === 'number'
            ? Math.min( 100, Math.max( 0, obj.progress ) )
            : null;

        // Set processing progress
        if ( pct !== null ) {
            this.progressIndicator.setProperty( '--progress', pct );
            this.progressLabel.textContent = Math.round( pct ) + '%';
        }

        // Set processing message
        if ( msg ) this.progressMessage.textContent = msg;

        // If processing is done, redirect to video page after short delay
        if ( obj.phase === 'done' && obj.videoId ) setTimeout(
            () => location.href = `/watch/${obj.videoId}`, 800
        );

    }

    submit ( e ) {

        e.preventDefault();

        // Set uploading state
        if ( this.isUploading ) return;

        this.isUploading = true;
        this.form.classList.add( 'processing' );

        // Prepare form data
        const formData = new FormData( this.form );

    }

    reset () { this.clearFileSelect() }

}

document.addEventListener( 'DOMContentLoaded', () => new VideoUploader() );
