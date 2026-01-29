import { Channel, Video } from '../types';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// ISO 8601 duration parser to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;

  const hours = (parseInt(match[1] || '0') || 0);
  const minutes = (parseInt(match[2] || '0') || 0);
  const seconds = (parseInt(match[3] || '0') || 0);

  return hours * 3600 + minutes * 60 + seconds;
};

const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error?.message || `API 호출 실패 (Status: ${response.status})`;
    
    if (response.status === 403) {
      if (message.includes('quota') || message.includes('limit')) {
        throw new Error(`[할당량 초과] YouTube API 일일 사용량을 모두 소진했습니다. 내일 다시 시도하거나 다른 API 키를 사용해주세요.`);
      }
      if (message.includes('referer')) {
        throw new Error(`[도메인 차단] Google Cloud Console에서 현재 도메인을 허용 목록에 추가해야 합니다.`);
      }
      throw new Error(`[접근 거부] ${message}`);
    }
    throw new Error(message);
  }
};

export const fetchChannelInfo = async (identifier: string, apiKey: string): Promise<Omit<Channel, 'folderId'>> => {
  const cleanId = identifier.trim();
  if (!cleanId) throw new Error('채널 식별자를 입력해주세요.');

  const fetchById = async (id: string) => {
    const url = `${BASE_URL}/channels?part=snippet,contentDetails&id=${id}&key=${apiKey}`;
    const res = await fetch(url);
    await handleApiError(res);
    const data = await res.json();
    if (!data.items?.length) throw new Error('채널을 찾을 수 없습니다.');
    const item = data.items[0];
    return {
      id: item.id,
      title: item.snippet.title,
      handle: item.snippet.customUrl,
      thumbnail: item.snippet.thumbnails.default.url,
      uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    };
  };

  const fetchByHandle = async (handle: string) => {
    const url = `${BASE_URL}/channels?part=snippet,contentDetails&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`;
    const res = await fetch(url);
    await handleApiError(res);
    const data = await res.json();
    if (!data.items?.length) return searchByName(handle);
    const item = data.items[0];
    return {
      id: item.id,
      title: item.snippet.title,
      handle: item.snippet.customUrl,
      thumbnail: item.snippet.thumbnails.default.url,
      uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads,
    };
  };

  const searchByName = async (name: string) => {
    // Search API는 100포인트를 소모하므로 주의 필요
    const url = `${BASE_URL}/search?part=snippet&type=channel&q=${encodeURIComponent(name)}&maxResults=1&key=${apiKey}`;
    const res = await fetch(url);
    await handleApiError(res);
    const data = await res.json();
    if (!data.items?.length) throw new Error(`'${name}' 채널을 찾을 수 없습니다.`);
    return fetchById(data.items[0].id.channelId);
  };

  if (cleanId.startsWith('@')) return fetchByHandle(cleanId);
  if (cleanId.startsWith('UC') && cleanId.length > 20) return fetchById(cleanId);
  return searchByName(cleanId);
};

export const fetchRecentVideos = async (channels: Channel[], apiKey: string, days: number = 30): Promise<Video[]> => {
  if (channels.length === 0) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  // 1단계: 모든 채널에서 최근 영상 ID 수집 (채널당 1포인트 소모)
  const videoToChannelMap: Record<string, { channelId: string, channelTitle: string }> = {};
  const allVideoIds: string[] = [];

  const playlistPromises = channels.map(async (channel) => {
    try {
      const maxResults = days > 7 ? 50 : 20;
      const url = `${BASE_URL}/playlistItems?part=snippet,contentDetails&playlistId=${channel.uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
          // 개별 채널 오류 시 해당 채널만 건너뜀
          return;
      }
      const data = await res.json();
      if (!data.items) return;

      for (const item of data.items) {
        const publishedAt = new Date(item.snippet.publishedAt);
        if (publishedAt >= cutoffDate) {
          const vId = item.contentDetails.videoId;
          allVideoIds.push(vId);
          videoToChannelMap[vId] = { channelId: channel.id, channelTitle: channel.title };
        }
      }
    } catch (e) {
      console.warn(`Failed to fetch playlist for ${channel.title}`, e);
    }
  });

  await Promise.all(playlistPromises);

  if (allVideoIds.length === 0) return [];

  // 2단계: 수집된 ID들을 50개씩 묶어서 상세 정보 조회 (묶음당 1포인트 소모 - 매우 효율적)
  const finalVideos: Video[] = [];
  const chunkSize = 50;
  
  for (let i = 0; i < allVideoIds.length; i += chunkSize) {
    const chunk = allVideoIds.slice(i, i + chunkSize);
    try {
      const url = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${apiKey}`;
      const res = await fetch(url);
      await handleApiError(res);
      const data = await res.json();

      if (data.items) {
        data.items.forEach((item: any) => {
          const durationSec = parseDuration(item.contentDetails.duration);
          const channelInfo = videoToChannelMap[item.id];
          finalVideos.push({
            id: item.id,
            channelId: channelInfo?.channelId || item.snippet.channelId,
            channelTitle: channelInfo?.channelTitle || item.snippet.channelTitle,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            publishedAt: item.snippet.publishedAt,
            viewCount: parseInt(item.statistics.viewCount || '0'),
            likeCount: parseInt(item.statistics.likeCount || '0'),
            commentCount: parseInt(item.statistics.commentCount || '0'),
            duration: item.contentDetails.duration,
            isShort: durationSec <= 180,
          });
        });
      }
    } catch (e) {
      console.error("Failed to fetch video details chunk", e);
    }
  }

  return finalVideos;
};
