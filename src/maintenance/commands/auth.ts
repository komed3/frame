import { confirm } from '@/src/maintenance/utils/prompt';
import { ui } from '@/src/maintenance/utils/ui';
import { Auth } from '@/src/server/core/Auth';
import { Command } from 'commander';


export const registerAuthCommands = ( program: Command ) : void => {
  const authCommand = program
    .command( 'auth' )
    .description( 'Manage authentication sessions' );

  authCommand
    .command( 'sessions' )
    .description( 'List active sessions' )
    .action( () => {
      const sessions = Auth.listSessions();
      if ( ! sessions.length ) return ui.info( 'No active sessions.' );

      console.table( sessions.map( session => ( {
        id: session.id, userId: session.userId, username: session.username, admin: session.isAdmin,
        createdAt: session.createdAt, lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt
      } ) ) );
    } );

  authCommand
    .command( 'clear' )
    .description( 'Revoke all sessions' )
    .option( '-y, --yes', 'Confirm revoking all sessions without prompting' )
    .action( async ( options: { yes?: boolean } ) => {
      if ( ! options.yes && ! await confirm( 'Revoke all active sessions?' ) ) return ui.cancelled();

      const count = Auth.logoutAll();
      ui.success( `Revoked ${ count } session(s).` );
    } );
};
