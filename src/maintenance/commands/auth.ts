import { confirm } from '@/src/maintenance/utils/prompt';
import { auth } from '@/src/server/core/Auth';
import { Command } from 'commander';


export const registerAuthCommands = ( program: Command ) : void => {
  const authCommand = program
    .command( 'auth' )
    .description( 'Manage authentication sessions' );

  authCommand
    .command( 'sessions' )
    .description( 'List active sessions' )
    .action( () => {
      const sessions = auth.listSessions();

      if ( ! sessions.length ) {
        console.log( 'No active sessions.' );
        return;
      }

      console.table( sessions.map( session => ( {
        id: session.id, userId: session.userId, username: session.username,
        admin: session.isAdmin, createdAt: session.createdAt, lastSeenAt: session.lastSeenAt,
        expiresAt: session.expiresAt
      } ) ) );
    } );

  authCommand
    .command( 'logout-all' )
    .description( 'Revoke all sessions' )
    .option( '-y, --yes', 'Confirm revoking all sessions without prompting' )
    .action( async ( options: { yes?: boolean } ) => {
      if ( ! options.yes && ! await confirm( 'Revoke all active sessions?' ) ) {
        console.log( 'Cancelled.' );
        return;
      }

      const count = auth.logoutAll();
      console.log( `Revoked ${ count } session(s).` );
    } );
}
