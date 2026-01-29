export interface Channel {
  id: string;
  title: string;
  handle?: string;
  thumbnail: string;
  uploadsPlaylistId: string;
  folderId: string;
}

export interface Folder {
  id: string;
  name: string;
}

export interface Video {
  id: string;
  channelId: string;
  channelTitle: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  duration: string; // ISO 8601
  isShort: boolean;
}

export type VideoTypeFilter = 'ALL' | 'LONG' | 'SHORT';

export interface AppState {
  apiKey: string;
  channels: Channel[];
  folders: Folder[];
  videos: Video[];
  isLoading: boolean;
  lastFetched: number | null;
}

export enum SortOption {
  VIEWS_DESC = 'VIEWS_DESC',
  LIKES_DESC = 'LIKES_DESC',
  COMMENTS_DESC = 'COMMENTS_DESC',
  DATE_DESC = 'DATE_DESC'
}