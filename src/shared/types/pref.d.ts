export interface PrefSchema {
  PLAYER_VOLUME: number;
  PLAYER_MUTED: boolean;
  PLAYER_PLAYBACK_RATE: number;
  PLAYER_AUTOPLAY_NEXT: boolean;
  PLAYER_SUBTITLE_MODE: 'auto' | 'on' | 'off';
}

export type PrefName = keyof PrefSchema;
export type PrefValue< K extends PrefName > = PrefSchema[ K ];

export type PrefDefinition< T > = {
  default: T;
  desc: string;
} & (
  T extends number ? { type: 'number', min: number, max: number } :
  T extends boolean ? { type: 'boolean' } :
  { type: 'enum', values: readonly T[] }
);

export type PrefTable = {
  [ K in PrefName ]: PrefDefinition< PrefSchema[ K ] >
};

export interface PrefRow {
  key: string;
  value_json: string;
  updated_at: string;
}
