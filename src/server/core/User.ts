import { conn } from '@/src/server/core/Database';
import type { UserRow } from '@/src/shared/types/user';


export class User {
  private getRow ( userId: number ) : UserRow | null {
    return conn.prepare( 'SELECT * FROM users WHERE id = ?' ).get( userId ) as unknown as UserRow | null;
  }
}
