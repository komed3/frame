import { conn } from '@/src/server/core/Database';
import type { UserRecord, UserRow } from '@/src/shared/types/user';


export class User {
  private getRow ( userId: number ) : UserRow | null {
    return conn.prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) as unknown as UserRow | null;
  }

  private toRecord ( row: UserRow ) : UserRecord {
    return {
      id: row.id, username: row.username, isAdmin: row.is_admin === 1,
      createdAt: row.created_at, disabledAt: row.disabled_at
    };
  }
}
