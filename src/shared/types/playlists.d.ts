export interface PlaylistRecord {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItemRecord {
  playlistId: number;
  mediaId: number;
  position: number;
  addedAt: string;
}

export interface PlaylistUpdate {
  name?: string;
  description?: string | null;
}
