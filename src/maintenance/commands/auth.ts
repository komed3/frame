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
}
