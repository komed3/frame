export async function themes ( req, res ) {

    res.render( 'themes', {
        title: req.t( 'views.themes.title' ),
        path: '/themes', template: 'themes'
    } );

}
