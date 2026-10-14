import { users } from '@/src/server/core/User';
import { Command } from 'commander';
import { promptPassword } from '@/src/maintenance/utils/prompt';


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
  const userCommand = program
    .command( 'user' )
    .description( 'Manage users' );

  userCommand
    .command( 'list' )
    .description( 'List all users' )
    .action( () => console.table( users.list().map( user => ( {
      id: user.id, username: user.username, admin: user.isAdmin,
      status: user.disabledAt ? 'disabled' : 'active',
      createdAt: user.createdAt
    } ) ) ) );

  userCommand
    .command( 'create <username>' )
    .description( 'Create a user' )
    .option( '--admin', 'Grant administrator privileges' )
    .action( async ( username: string, options: { admin?: boolean } ) => {
      const wd = await promptPassword( 'Password: ' );
      const conf = await promptPassword( 'Confirm password: ' );
      if ( wd !== conf ) throw new Error( 'Passwords do not match' );

      const created = await users.create( username, wd, !! options.admin );
      console.log( `Created user ${ created.username } (ID ${ created.id })` );
    } );

  userCommand
    .command( 'delete <user>' )
    .description( 'Delete a user by ID or username' )
    .option( '--yes', 'Confirm deletion' )
    .action( ( ref: string, options: { yes?: boolean } ) => {
      if ( ! options.yes ) throw new Error( 'Deletion requires --yes' );

      const target = resolveUser( ref );

      if ( target.isAdmin && ! target.disabledAt && users.list().filter(
        user => user.isAdmin && ! user.disabledAt
      ).length <= 1 ) throw new Error( 'Cannot delete the last active administrator' );

      users.delete( target.id );
      console.log( `Deleted user ${ target.username } (ID ${ target.id })` );
    } );

  userCommand
    .command( 'rename <user> <username>' )
    .description( 'Change a username' )
    .requiredOption( '--actor <id>', 'ID of the acting user' )
    .action( ( ref: string, username: string, options: { actor: string } ) => {
      const target = resolveUser( ref );
      const updated = users.changeUsername( resolveId( options.actor ), target.id, username );

      console.log( `Renamed user to ${ updated.username } (ID ${ updated.id })` );
    } );

  userCommand
    .command( 'password <user>' )
    .description( 'Change a user password' )
    .requiredOption( '--actor <id>', 'ID of the acting user' )
    .requiredOption( '--pw <password>', 'New password' )
    .option( '--current-pw <password>', 'Current password when changing your own password' )
    .action( async ( ref: string, options: { actor: string; pw: string; currentPw?: string } ) => {
      const target = resolveUser( ref );
      await users.changePassword( resolveId( options.actor ), target.id, options.pw, options.currentPw );

      console.log( `Changed password for ${ target.username } (ID ${ target.id })` );
      console.log( 'All sessions for this user have been revoked.' );
    } );

  userCommand
    .command( 'admin <user>' )
    .description( 'Grant or revoke administrator privileges' )
    .requiredOption( '--actor <id>', 'ID of the acting administrator' )
    .option( '--revoke', 'Revoke administrator privileges' )
    .action( ( ref: string, options: { actor: string; revoke?: boolean } ) => {
      const target = resolveUser( ref );
      users.setAdmin( resolveId( options.actor ), target.id, ! options.revoke );

      console.log(
        `${ options.revoke ? 'Revoked' : 'Granted' } administrator privileges ` +
        `for ${ target.username }`
      );
    } );

  userCommand
    .command( 'disable <user>' )
    .description( 'Disable a user and revoke their sessions' )
    .requiredOption( '--actor <id>', 'ID of the acting administrator' )
    .action( ( ref: string, options: { actor: string } ) => {
      const target = resolveUser( ref );
      users.setDisabled( resolveId( options.actor ), target.id, true );

      console.log( `Disabled user ${ target.username } (ID ${ target.id })` );
    } );

  userCommand
    .command( 'enable <user>' )
    .description( 'Enable a disabled user' )
    .requiredOption( '--actor <id>', 'ID of the acting administrator' )
    .action( ( ref: string, options: { actor: string } ) => {
      const target = resolveUser( ref );
      users.setDisabled( resolveId( options.actor ), target.id, false );

      console.log( `Enabled user ${ target.username } (ID ${ target.id })` );
    } );
}
