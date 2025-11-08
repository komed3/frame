class VideoUploader {

    constructor () {

        this.form = document.querySelector( '.frame-upload' );
        this.dropArea = this.form.querySelector( '.frame-upload--file-drop' );
        this.fileInput = this.dropArea.querySelector( 'input' );
        this.preview = this.form.querySelector( '.frame-upload--file-preview' );
        this.video = this.preview.querySelector( 'video' );
        this.fileInfo = this.form.querySelector( '.frame-upload--file-info' );
        this.progress = this.form.querySelector( '.frame-upload--progress' );

        this.isUploading = false;
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

    submit ( e ) {

        e.preventDefault();

        // Submit form

    }

    reset () { this.clearFileSelect() }

}

document.addEventListener( 'DOMContentLoaded', () => new VideoUploader() );
