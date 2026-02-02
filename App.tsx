
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { AppState, Channel, Folder, Video, AnalysisPeriod } from './types';
import { fetchChannelInfo, fetchRecentVideos } from './services/youtubeService';

const STORAGE_KEY = 'yt_dashboard_state';
const VIDEO_CACHE_KEY = 'yt_dashboard_videos';

const getEnvApiKey = () => {
  try {
    // @ts-ignore
    return import.meta.env?.VITE_YOUTUBE_API_KEY || '';
  } catch {
    return '';
  }
};

const DEFAULT_API_KEY = getEnvApiKey();

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>('');
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
    // 로컬 스토리지에서 기본 데이터 로드
    const savedState = localStorage.getItem(STORAGE_KEY);
    const savedVideos = localStorage.getItem(VIDEO_CACHE_KEY);

    let initialApiKey = DEFAULT_API_KEY;
    let initialChannels: Channel[] = [];
    let initialFolders: Folder[] = [];
    let initialPeriod: AnalysisPeriod = 30;

    if (savedState) {
      const parsed = JSON.parse(savedState);
      initialApiKey = parsed.apiKey || DEFAULT_API_KEY;
      initialChannels = parsed.channels || [];
      initialFolders = parsed.folders || [];
      initialPeriod = parsed.period || 30;
    }

    // URL 공유 파라미터 확인 (로컬 스토리지 데이터보다 우선순위 높음)
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        const jsonStr = decodeURIComponent(escape(window.atob(shareData)));
        const data = JSON.parse(jsonStr);
        if (data.apiKey) initialApiKey = data.apiKey;
        if (data.channels) initialChannels = data.channels;
        if (data.folders) initialFolders = data.folders;
        
        // URL에서 share 파라미터 제거 (깔끔한 URL 유지)
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log("Shared config applied successfully");
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

  // 설정값 저장
  useEffect(() => {
    if (apiKey || channels.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ apiKey, channels, folders, period }));
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
    // 30분 캐시 (강제 새로고침이 아니거나 기간 변경이 아닐 때만 적용)
    if (!force && !customPeriod && lastFetched && (now - lastFetched < 30 * 60 * 1000)) {
      return;
    }
    
    setIsLoading(true);
    try {
      const targetPeriod = customPeriod || period;
      const newVideos = await fetchRecentVideos(channels, apiKey, targetPeriod);
      setVideos(newVideos);
      setDataPeriod(targetPeriod);
      setLastFetched(Date.now());
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, channels, period, lastFetched]);

  // 기간 변경 감지 및 자동 로드
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
    if (!apiKey) { alert("API 키를 먼저 입력해주세요."); return; }
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
        {apiKey ? (
             <Dashboard 
                videos={videos} channels={channels}
                selectedFolderId={selectedFolderId}
                selectedChannelId={selectedChannelId}
                folders={folders} isLoading={isLoading}
                period={period} setPeriod={setPeriod}
             />
        ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
                <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 text-center max-w-lg">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">API 키가 필요합니다</h2>
                    <p className="text-slate-600 mb-4">사이드바 설정에서 API 키를 입력하거나, 공유받은 링크로 접속해 주세요.</p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
