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

  user
    .command( 'delete <user>' )
    .description( 'Delete a user by ID or username' )
    .option( '--yes', 'Confirm deletion' )
    .action( ( reference: string, options: { yes?: boolean } ) => {
      if ( ! options.yes ) throw new Error( 'Deletion requires --yes' );

      const target = resolveUser( reference );

      if ( target.isAdmin && ! target.disabledAt && users.list().filter(
        user => user.isAdmin && ! user.disabledAt
      ).length <= 1 ) throw new Error( 'Cannot delete the last active administrator' );

      users.delete( target.id );
      console.log( `Deleted user ${ target.username } (ID ${ target.id })` );
    } );

  user
    .command( 'rename <user> <username>' )
    .description( 'Change a username' )
    .requiredOption( '--actor <id>', 'ID of the acting user' )
    .action( ( reference: string, username: string, options: { actor: string } ) => {
      const target = resolveUser( reference );
      const updated = users.changeUsername( resolveId( options.actor ), target.id, username );

      console.log( `Renamed user to ${ updated.username } (ID ${ updated.id })` );
    } );

  user
    .command( 'password <user>' )
    .description( 'Change a user password' )
    .requiredOption( '--actor <id>', 'ID of the acting user' )
    .requiredOption( '--password <password>', 'New password' )
    .option( '--current-password <password>', 'Current password when changing your own password' )
    .action( async ( reference: string, options: { actor: string; password: string; currentPassword?: string } ) => {
      const target = resolveUser( reference );
      await users.changePassword( resolveId( options.actor ), target.id, options.password, options.currentPassword );

      console.log( `Changed password for ${ target.username } (ID ${ target.id })` );
      console.log( 'All sessions for this user have been revoked.' );
    } );
}
