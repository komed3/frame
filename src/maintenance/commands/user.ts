import { confirm, promptConfirmedPassword, promptPassword } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { User } from '@/src/server/core/User';
import { Command } from 'commander';


const resolveUser = ( ref: string ) => {
  const user = /^\d+$/.test( ref ) ? User.get( Number( ref ) ) : User.getByUsername( ref );
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
    .action( () => {
      const list = User.list();
      if ( ! list.length ) return ui.info( 'No users found.' );

      console.table( list.map( user => ( {
        id: user.id, username: user.username, admin: user.isAdmin,
        status: user.disabledAt ? 'disabled' : 'active',
        createdAt: user.createdAt
      } ) ) );
    } );

  userCommand
    .command( 'create <username>' )
    .description( 'Create a user' )
    .option( '--admin', 'Grant administrator privileges' )
    .action( async ( username: string, options: { admin?: boolean } ) => {
      const name = User.validateUsername( username );
      if ( User.getByUsername( name ) ) throw new Error( 'Username is already taken' );

      const pw = await promptConfirmedPassword( pw => User.validatePassword( pw ) );
      const created = await User.create( name, pw, !! options.admin );

      ui.nl();
      ui.success( `Created user ${ created.username } (ID ${ created.id })` );
    } );

  userCommand
    .command( 'delete <user>' )
    .description( 'Delete a user by ID or username' )
    .option( '-y, --yes', 'Confirm deletion' )
    .action( async ( ref: string, options: { yes?: boolean } ) => {
      const target = resolveUser( ref );

      if ( ! options.yes && ! await confirm( `Delete user ${ target.username } (ID ${ target.id })?` ) )
        return ui.cancelled();

      if ( target.isAdmin && ! target.disabledAt && User.list().filter(
        user => user.isAdmin && ! user.disabledAt
      ).length <= 1 ) throw new Error( 'Cannot delete the last active administrator' );

      User.delete( target.id );
      ui.success( `Deleted user ${ target.username } (ID ${ target.id })` );
    } );

  userCommand
    .command( 'rename <user> <username>' )
    .description( 'Change a username' )
    .requiredOption( '--actor <id>', 'ID of the acting user' )
    .action( ( ref: string, username: string, options: { actor: string } ) => {
      const target = resolveUser( ref );
      const updated = User.changeUsername( resolveId( options.actor ), target.id, username );

      ui.success( `Renamed user to ${ updated.username } (ID ${ updated.id })` );
    } );

  userCommand
    .command( 'password <user>' )
    .description( 'Change a user password' )
    .requiredOption( '--actor <id>', 'ID of the acting user' )
    .action( async ( ref: string, options: { actor: string } ) => {
      const target = resolveUser( ref ), actorId = resolveId( options.actor );
      const curPw = actorId === target.id ? await promptPassword( 'Current password: ' ) : undefined;
      const pw = await promptConfirmedPassword( pw => User.validatePassword( pw ) );

      await User.changePassword( actorId, target.id, pw, curPw );

      ui.nl();
      ui.success( `Changed password for ${ target.username } (ID ${ target.id })` );
      ui.info( 'All sessions for this user have been revoked.' );
    } );

  userCommand
    .command( 'admin <user>' )
    .description( 'Grant or revoke administrator privileges' )
    .requiredOption( '--actor <id>', 'ID of the acting administrator' )
    .option( '--revoke', 'Revoke administrator privileges' )
    .action( ( ref: string, options: { actor: string; revoke?: boolean } ) => {
      const target = resolveUser( ref );
      User.setAdmin( resolveId( options.actor ), target.id, ! options.revoke );

      ui.success( `${ options.revoke ? 'Revoked' : 'Granted' } administrator privileges for ${ target.username }` );
    } );

  userCommand
    .command( 'disable <user>' )
    .description( 'Disable a user and revoke their sessions' )
    .requiredOption( '--actor <id>', 'ID of the acting administrator' )
    .action( ( ref: string, options: { actor: string } ) => {
      const target = resolveUser( ref );
      User.setDisabled( resolveId( options.actor ), target.id, true );

      ui.success( `Disabled user ${ target.username }` );
    } );

  userCommand
    .command( 'enable <user>' )
    .description( 'Enable a disabled user' )
    .requiredOption( '--actor <id>', 'ID of the acting administrator' )
    .action( ( ref: string, options: { actor: string } ) => {
      const target = resolveUser( ref );
      User.setDisabled( resolveId( options.actor ), target.id, false );

      ui.success( `Enabled user ${ target.username }` );
    } );
};
