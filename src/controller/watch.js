export function watch ( req, res ) {

    res.render( 'watch', {
        title: req.t( 'views.watch.title' ),
        path: '/watch/', template: 'watch'
    } );

}
