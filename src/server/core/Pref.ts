import { as, conn } from '@/src/server/core/Database';
import type { PrefName, PrefRow, PrefSchema, PrefTable, PrefValue } from '@/src/shared/types/pref';


export class Pref {
  public static readonly schema = {
    PLAYER_VOLUME: { type: 'number', desc: 'Default player volume', default: 1, min: 0, max: 1 },
    PLAYER_MUTED: { type: 'boolean', desc: 'Start playback muted', default: false },
    PLAYER_PLAYBACK_RATE: { type: 'number', desc: 'Default playback speed', default: 1, min: 0.25, max: 4 },
    PLAYER_AUTOPLAY_NEXT: { type: 'boolean', desc: 'Automatically play the next item', default: false },
    PLAYER_SUBTITLE_MODE: { type: 'enum', desc: 'Default subtitle behavior', default: 'auto', values: [ 'auto', 'on', 'off' ] }
  } satisfies PrefTable;

  private static isName ( name: string ) : name is PrefName {
    return Object.hasOwn( this.schema, name );
  }
}
