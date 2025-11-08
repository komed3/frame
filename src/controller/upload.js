export function upload ( req, res ) {

    res.render( 'upload', {
        title: req.t( 'views.upload.title' ),
        path: '/upload', template: 'upload'
    } );

}
