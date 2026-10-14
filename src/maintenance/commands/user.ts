import { users } from '@/src/server/core/User';
import { Command } from 'commander';


const resolveUser = ( ref: string ) => {
  const user = /^\d+$/.test( ref ) ? users.get( Number( ref ) ) : users.getByUsername( ref );
  if ( ! user ) throw new Error( `User not found: ${ ref }` );
  return user;
};

const resolveId = ( value: string ) : number => {
  const id = Number( value );
  if ( ! Number.isSafeInteger( id ) || id <= 0 ) throw new Error( `Invalid ID: ${ value }` );
  return id;
};


export const registerUserCommands = ( program: Command ) : void => {
  const user = program
    .command( 'user' )
    .description( 'Manage users' );

  user
    .command( 'list' )
    .description( 'List all users' )
    .action( () => console.table( users.list().map( user => ( {
      id: user.id, username: user.username, admin: user.isAdmin,
      status: user.disabledAt ? 'disabled' : 'active',
      createdAt: user.createdAt
    } ) ) ) );

  user
    .command( 'create <username>' )
    .description( 'Create a user' )
    .requiredOption( '--password <password>', 'Initial password' )
    .option( '--admin', 'Grant administrator privileges' )
    .action( async ( username: string, options: { password: string; admin?: boolean } ) => {
      const created = await users.create( username, options.password, !! options.admin );
      console.log( `Created user ${ created.username } (ID ${ created.id })` );
    } );
}
