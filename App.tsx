
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { AppState, Channel, Folder, Video, AnalysisPeriod } from './types';
import { fetchChannelInfo, fetchRecentVideos } from './services/youtubeService';
import { Key } from 'lucide-react';

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

    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        const jsonStr = decodeURIComponent(escape(window.atob(shareData)));
        const data = JSON.parse(jsonStr);
        if (data.apiKey) initialApiKey = data.apiKey;
        if (data.channels) initialChannels = data.channels;
        if (data.folders) initialFolders = data.folders;
        window.history.replaceState({}, document.title, window.location.pathname);
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
    if (!force && !customPeriod && lastFetched && (now - lastFetched < 30 * 60 * 1000)) return;
    
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
    if (!apiKey) return;
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
                apiKey={apiKey} setApiKey={setApiKey}
             />
        ) : (
            <div className="flex items-center justify-center h-full px-4">
                <div className="bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 text-center max-w-md w-full">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Key size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">YouTube Analytics 시작하기</h2>
                    <p className="text-slate-500 mb-8 text-sm">성과를 분석할 채널을 불러오기 위해<br/>YouTube Data API 키를 입력해 주세요.</p>
                    
                    <div className="space-y-4">
                        <input
                            type="password"
                            placeholder="API 키를 입력하세요"
                            className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none text-center"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    setApiKey((e.target as HTMLInputElement).value);
                                }
                            }}
                        />
                        <button 
                            onClick={() => {
                                const input = document.querySelector('input[type="password"]') as HTMLInputElement;
                                if (input.value) setApiKey(input.value);
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg"
                        >
                            시작하기
                        </button>
                    </div>
                    <p className="mt-6 text-[11px] text-slate-400">
                        API 키가 없으신가요? <a href="https://console.cloud.google.com/" target="_blank" className="underline hover:text-blue-600">Google Cloud Console</a>에서 무료로 발급 가능합니다.
                    </p>
                </div>
            </div>
        )}
      </main>
    </div>
  );
};

export default App;
