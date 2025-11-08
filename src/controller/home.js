export function home ( req, res ) {

    res.render( 'home', {
        title: req.t( 'views.home.title' ),
        path: '/', template: 'home'
    } );

}
