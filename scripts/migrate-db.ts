import( '../src/server/db.ts' )
  .then( () => console.log( 'Database migrated' ) )
  .catch( err => console.log( err ) );
