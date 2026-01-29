import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { AppState, Channel, Folder, Video } from './types';
import { fetchChannelInfo, fetchRecentVideos } from './services/youtubeService';

const STORAGE_KEY = 'yt_dashboard_state';

// 환경 변수 안전하게 가져오기 (Vite 환경)
const getEnvApiKey = () => {
  try {
    // @ts-ignore
    return import.meta.env?.VITE_YOUTUBE_API_KEY || '';
  } catch {
    return '';
  }
};

const DEFAULT_API_KEY = getEnvApiKey();

// URL 공유 데이터 파싱 (Base64 Unicode safe)
const getSharedData = (): Partial<AppState> | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const shareParam = params.get('share');
  
  if (!shareParam) return null;
  
  try {
    // Unicode string decoding from Base64
    const jsonStr = decodeURIComponent(escape(window.atob(shareParam)));
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse shared configuration", e);
    return null;
  }
};

// 앱 시작 시 한 번만 실행하여 공유된 설정을 가져옴
const sharedData = getSharedData();

// Helper to safely load initial state from localStorage
// 우선순위: 공유된 데이터 > 로컬스토리지 > 기본값(환경변수 등)
const loadInitialState = <T,>(key: keyof AppState, defaultValue: T): T => {
  // 1. URL 공유 데이터가 있으면 최우선 사용
  if (sharedData && sharedData[key] !== undefined) {
      return sharedData[key] as T;
  }

  // 2. 로컬 스토리지 확인
  try {
    const storedState = localStorage.getItem(STORAGE_KEY);
    if (storedState) {
      const parsed = JSON.parse(storedState);
      
      // API Key 특수 처리: 저장된 키가 비어있고 기본 환경변수가 있으면 환경변수 사용
      if (key === 'apiKey' && (!parsed[key] || parsed[key] === '') && defaultValue) {
          return defaultValue;
      }
      return parsed[key] !== undefined ? parsed[key] : defaultValue;
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }

  // 3. 기본값 반환
  return defaultValue;
};

const App: React.FC = () => {
  // --- State (with Lazy Initialization) ---
  const [apiKey, setApiKey] = useState<string>(() => loadInitialState('apiKey', DEFAULT_API_KEY));
  const [channels, setChannels] = useState<Channel[]>(() => loadInitialState('channels', []));
  const [folders, setFolders] = useState<Folder[]>(() => loadInitialState('folders', []));
  
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);

  // --- Persistence (Save only) ---
  // 공유된 링크로 들어왔더라도, 사용자가 수정하면 로컬에 저장되도록 함
  useEffect(() => {
    const stateToSave: Partial<AppState> = {
      apiKey,
      channels,
      folders,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
  }, [apiKey, channels, folders]);


  // --- Actions ---

  const refreshData = useCallback(async () => {
    if (!apiKey || channels.length === 0) return;
    
    setIsLoading(true);
    try {
      const newVideos = await fetchRecentVideos(channels, apiKey);
      setVideos(newVideos);
    } catch (error) {
      alert("영상 데이터를 가져오는데 실패했습니다. API 키나 할당량을 확인해주세요.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey, channels]);

  // 공유 링크로 접속 시 자동 데이터 로드 (API 키와 채널이 있을 경우)
  useEffect(() => {
      if (sharedData && apiKey && channels.length > 0) {
          // 약간의 지연을 주어 UI 렌더링 후 실행
          const timer = setTimeout(() => {
              refreshData();
          }, 500);
          return () => clearTimeout(timer);
      }
  }, []); // Mount 시 1회 체크 (sharedData는 컴포넌트 외부 변수라 의존성 불필요하지만, 로직상 최초 1회만)

  const addFolder = (name: string) => {
    const newFolder: Folder = {
      id: `f-${Date.now()}`,
      name,
    };
    setFolders([...folders, newFolder]);
  };

  const addChannel = async (identifier: string, folderId: string) => {
    if (!apiKey) {
      alert("먼저 YouTube API 키를 입력해주세요.");
      return;
    }
    
    // Check duplicates
    if (channels.some(c => c.handle === identifier || c.id === identifier)) {
        alert("이미 존재하는 채널일 수 있습니다.");
        // Proceeding anyway but user should know
    }

    try {
      const info = await fetchChannelInfo(identifier, apiKey);
      
      if (channels.some(c => c.id === info.id)) {
        alert("이미 추가된 채널입니다!");
        return;
      }

      // Handle Folder Assignment
      let targetFolderId = folderId;
      let currentFolders = [...folders];

      // If no folder ID is provided (or empty), handle auto-creation or default assignment
      if (!targetFolderId) {
          if (currentFolders.length === 0) {
              const newFolderId = `f-${Date.now()}`;
              const newFolder = { id: newFolderId, name: '기본 폴더' };
              currentFolders = [newFolder];
              setFolders(currentFolders); // Update state
              targetFolderId = newFolderId;
          } else {
              targetFolderId = currentFolders[0].id;
          }
      }

      const newChannel: Channel = {
        ...info,
        folderId: targetFolderId,
      };
      
      const updatedChannels = [...channels, newChannel];
      setChannels(updatedChannels);
      
      // Auto-select the folder if none was selected, so the user sees the new channel
      if (!selectedFolderId) {
          setSelectedFolderId(targetFolderId);
          setSelectedChannelId(null);
      }
      
      // Fetch videos for this new channel immediately
      const newVideos = await fetchRecentVideos([newChannel], apiKey);
      setVideos(prev => [...prev, ...newVideos]);

    } catch (error) {
      console.error(error);
      alert("채널을 찾을 수 없습니다. 핸들/ID 또는 API 키를 확인해주세요.");
    }
  };

  const deleteChannel = (id: string) => {
    setChannels(channels.filter(c => c.id !== id));
    setVideos(videos.filter(v => v.channelId !== id));
    if (selectedChannelId === id) setSelectedChannelId(null);
  };

  const moveChannel = (channelId: string, targetFolderId: string) => {
    setChannels(prev => prev.map(c => 
      c.id === channelId ? { ...c, folderId: targetFolderId } : c
    ));
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar 
        apiKey={apiKey}
        setApiKey={setApiKey}
        folders={folders}
        channels={channels}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={(id) => {
            setSelectedFolderId(id);
            setSelectedChannelId(null); // Reset channel selection when folder changes
        }}
        selectedChannelId={selectedChannelId}
        setSelectedChannelId={setSelectedChannelId}
        addFolder={addFolder}
        addChannel={addChannel}
        deleteChannel={deleteChannel}
        moveChannel={moveChannel}
        refreshData={refreshData}
      />
      <main className="flex-1 ml-80 overflow-y-auto">
        {apiKey ? (
             <Dashboard 
                videos={videos}
                channels={channels}
                selectedFolderId={selectedFolderId}
                selectedChannelId={selectedChannelId}
                folders={folders}
                isLoading={isLoading}
             />
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p className="text-lg font-medium mb-2">Cycle Youtube Analytics에 오신 것을 환영합니다</p>
                <p className="text-sm">시작하려면 사이드바에 YouTube API 키를 입력해주세요.</p>
                {sharedData && (
                    <p className="text-xs text-blue-500 mt-2">공유된 설정을 불러왔으나 API 키가 없습니다.</p>
                )}
            </div>
        )}
       
      </main>
    </div>
  );
};

export default App;