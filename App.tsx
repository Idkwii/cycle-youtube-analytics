
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { Channel, Folder, Video, AnalysisPeriod } from './types';
import { fetchChannelInfo, fetchRecentVideos } from './services/youtubeService';
import LZString from 'lz-string';

const STORAGE_KEY = 'yt_dashboard_state';
const VIDEO_CACHE_KEY = 'yt_dashboard_videos';

/**
 * [중요] 여기에 본인의 YouTube Data API v3 키를 입력하세요.
 * 여기에 입력하면 공유받은 모든 사람이 별도의 입력 없이 바로 결과를 볼 수 있습니다.
 */
const CONST_API_KEY = 'AIzaSyA3JRkSp_eMJ3oWKhqDwIbY5IVbb99Uobc'; // <-- 여기에 'AIza...'로 시작하는 키를 입력하세요.

const getInitialApiKey = () => {
  if (CONST_API_KEY) return CONST_API_KEY;
  try {
    // @ts-ignore
    return import.meta.env?.VITE_YOUTUBE_API_KEY || ''; 
  } catch {
    return '';
  }
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(getInitialApiKey());
  const [channels, setChannels] = useState<Channel[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [period, setPeriod] = useState<AnalysisPeriod>(30);
  const [videos, setVideos] = useState<Video[]>([]);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [dataPeriod, setDataPeriod] = useState<AnalysisPeriod | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // 1. 초기화: 로컬 스토리지 및 URL 공유 파라미터 확인
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    const savedVideos = localStorage.getItem(VIDEO_CACHE_KEY);

    let initialApiKey = getInitialApiKey();
    let initialChannels: Channel[] = [];
    let initialFolders: Folder[] = [];
    let initialPeriod: AnalysisPeriod = 30;

    // 로컬 스토리지 로드
    if (savedState) {
      const parsed = JSON.parse(savedState);
      initialApiKey = CONST_API_KEY || parsed.apiKey || initialApiKey;
      initialChannels = parsed.channels || [];
      initialFolders = parsed.folders || [];
      initialPeriod = parsed.period || 30;
    }

    // URL 파라미터(공유 데이터) 로드 - URL이 스토리지보다 우선순위 높음
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        // 1. LZString 압축 해제 시도 (신규 방식)
        let jsonStr = LZString.decompressFromEncodedURIComponent(shareData);
        
        // 2. 실패 시 기존 Base64 방식 시도 (구버전 호환)
        if (!jsonStr) {
            try {
                jsonStr = decodeURIComponent(escape(window.atob(shareData)));
            } catch (e) { /* ignore */ }
        }

        if (jsonStr) {
            const data = JSON.parse(jsonStr);
            
            // 데이터 포맷 확인 (압축된 최소화 포맷인지, 일반 JSON인지)
            // 최소화 포맷: { k: key, f: [[id,name]...], c: [[id,fid,title]...] }
            if (data.c && Array.isArray(data.c)) {
                if (data.k && !CONST_API_KEY) initialApiKey = data.k;
                if (data.f) {
                    initialFolders = data.f.map((f: any[]) => ({ id: f[0], name: f[1] }));
                }
                initialChannels = data.c.map((c: any[]) => ({
                    id: c[0],
                    folderId: c[1],
                    title: c[2],
                    // 썸네일과 플레이리스트ID는 공유 시 제거되므로 복구
                    thumbnail: '', 
                    uploadsPlaylistId: c[0].replace(/^UC/, 'UU'),
                    handle: ''
                }));
            } else {
                // 기존 포맷
                if (data.apiKey && !CONST_API_KEY) initialApiKey = data.apiKey;
                if (data.channels) initialChannels = data.channels;
                if (data.folders) initialFolders = data.folders;
            }
        }
      } catch (e) {
        console.error("Failed to parse shared data", e);
      }
    }

    setApiKey(initialApiKey);
    setChannels(initialChannels);
    setFolders(initialFolders);
    setPeriod(initialPeriod);

    if (savedVideos) {
      const parsed = JSON.parse(savedVideos);
      setVideos(parsed.data || []);
      setLastFetched(parsed.timestamp || null);
      setDataPeriod(parsed.period || null);
    }
  }, []);

  // 2. 상태 변경 시 URL 및 로컬 스토리지 동기화
  useEffect(() => {
    // 로컬 스토리지 저장
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, channels, folders, period }));

    // URL 업데이트 (주소창 복사 지원을 위해)
    if (channels.length > 0) {
        try {
            // 데이터 최소화 (Minification)
            // { k: key, f: [[id,name]], c: [[id,folderId,title]] }
            const minifiedData: any = {
                f: folders.map(f => [f.id, f.name]),
                c: channels.map(c => [c.id, c.folderId, c.title])
            };
            
            if (!CONST_API_KEY && apiKey) {
                minifiedData.k = apiKey;
            }

            const jsonStr = JSON.stringify(minifiedData);
            // LZString 압축
            const compressed = LZString.compressToEncodedURIComponent(jsonStr);
            
            const newUrl = `${window.location.pathname}?share=${compressed}`;
            
            // 현재 주소와 다를 때만 업데이트
            const currentShare = new URLSearchParams(window.location.search).get('share');
            if (currentShare !== compressed) {
                window.history.replaceState({}, '', newUrl);
            }
        } catch (e) {
            console.error("URL update failed", e);
        }
    }
  }, [apiKey, channels, folders, period]);

  // 영상 데이터 캐시 저장
  useEffect(() => {
    if (videos.length > 0) {
      localStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify({ 
        data: videos, 
        timestamp: lastFetched,
        period: dataPeriod 
      }));
    }
  }, [videos, lastFetched, dataPeriod]);

  const refreshData = useCallback(async (customPeriod?: AnalysisPeriod, force = false) => {
    if (!apiKey || channels.length === 0) return;
    const now = Date.now();
    if (!force && !customPeriod && lastFetched && (now - lastFetched < 30 * 60 * 1000)) return;
    
    setIsLoading(true);
    try {
      const targetPeriod = customPeriod || period;
      const newVideos = await fetchRecentVideos(channels, apiKey, targetPeriod);
      setVideos(newVideos);
      setDataPeriod(targetPeriod);
      setLastFetched(Date.now());
    } catch (error: any) {
      console.error(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, channels, period, lastFetched]);

  useEffect(() => {
    if (apiKey && channels.length > 0) {
      if (dataPeriod !== period || !lastFetched) {
        refreshData(period);
      }
    }
  }, [apiKey, channels, period, dataPeriod, lastFetched, refreshData]);

  const addFolder = (name: string) => {
    setFolders([...folders, { id: `f-${Date.now()}`, name }]);
  };

  const addChannel = async (identifier: string, folderId: string) => {
    if (!apiKey) {
      alert("코드 내부에 API 키가 설정되지 않았습니다.");
      return;
    }
    setIsLoading(true);
    try {
      const info = await fetchChannelInfo(identifier, apiKey);
      if (channels.some(c => c.id === info.id)) {
        alert("이미 등록된 채널입니다.");
        return;
      }
      let targetId = folderId || (folders.length > 0 ? folders[0].id : null);
      if (!targetId) {
          const newF = { id: `f-${Date.now()}`, name: '기본 폴더' };
          setFolders([newF]);
          targetId = newF.id;
      }
      const newChannel = { ...info, folderId: targetId };
      setChannels(prev => [...prev, newChannel]);
      const newV = await fetchRecentVideos([newChannel], apiKey, period);
      setVideos(prev => [...prev, ...newV]);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteChannel = (id: string) => {
    setChannels(channels.filter(c => c.id !== id));
    setVideos(videos.filter(v => v.channelId !== id));
  };

  const moveChannel = (channelId: string, targetFolderId: string) => {
    setChannels(prev => prev.map(c => c.id === channelId ? { ...c, folderId: targetFolderId } : c));
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar 
        apiKey={apiKey} setApiKey={setApiKey}
        folders={folders} channels={channels}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={(id) => { setSelectedFolderId(id); setSelectedChannelId(null); }}
        selectedChannelId={selectedChannelId}
        setSelectedChannelId={setSelectedChannelId}
        addFolder={addFolder} addChannel={addChannel}
        deleteChannel={deleteChannel} moveChannel={moveChannel}
        refreshData={() => refreshData(undefined, true)}
      />
      <main className="flex-1 ml-80 overflow-y-auto">
        <Dashboard 
          videos={videos} channels={channels}
          selectedFolderId={selectedFolderId}
          selectedChannelId={selectedChannelId}
          folders={folders} isLoading={isLoading}
          period={period} setPeriod={setPeriod}
          apiKey={apiKey} setApiKey={setApiKey}
        />
      </main>
    </div>
  );
};

export default App;
