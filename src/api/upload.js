import {} from '../utils/config.js';
import {} from '../utils/search.js';
import { uploadVideo } from '../utils/video.js';

export async function upload ( req, res ) {

    uploadVideo( req, res, async ( err ) => {

        if ( err ) return res.status( 400 ).json( { success: false, message: req.t( 'error.upload.upload', { msg: err.message } ) } );
        if ( ! req.file ) return res.status( 400 ).json( { success: false, message: req.t( 'error.upload.noFile' ) } );

    } );

}
