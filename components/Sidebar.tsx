
import React, { useState } from 'react';
import { Folder, Channel } from '../types';
import { Plus, Trash2, FolderPlus, Youtube, RefreshCw, Folder as FolderIcon, GripVertical, ChevronRight, ChevronDown, Share2, BarChart3, ExternalLink } from 'lucide-react';

interface SidebarProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  folders: Folder[];
  channels: Channel[];
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  selectedChannelId: string | null;
  setSelectedChannelId: (id: string | null) => void;
  addFolder: (name: string) => void;
  addChannel: (identifier: string, folderId: string) => Promise<void>;
  deleteChannel: (id: string) => void;
  moveChannel: (channelId: string, folderId: string) => void;
  refreshData: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  apiKey,
  setApiKey,
  folders,
  channels,
  selectedFolderId,
  setSelectedFolderId,
  selectedChannelId,
  setSelectedChannelId,
  addFolder,
  addChannel,
  deleteChannel,
  moveChannel,
  refreshData
}) => {
  const [newFolderInput, setNewFolderInput] = useState('');
  const [newChannelInput, setNewChannelInput] = useState('');
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderInput.trim()) {
      addFolder(newFolderInput.trim());
      setNewFolderInput('');
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelInput.trim()) {
      let targetId = selectedFolderId;
      if (!targetId && folders.length > 0) {
          targetId = folders[0].id;
      }
      setIsAddingChannel(true);
      await addChannel(newChannelInput.trim(), targetId || "");
      setIsAddingChannel(false);
      setNewChannelInput('');
    }
  };

  const handleShareConfig = () => {
    // [수정] 주소창을 그냥 복사하는 것이 아니라, 현재 상태 데이터를 기반으로 확실한 URL을 생성합니다.
    try {
        const shareData: any = { channels, folders };
        // API 키가 하드코딩 되어있지 않은 경우에만 URL에 포함 (보안)
        // 여기서는 App.tsx 로직을 따르되, 공유 버튼이므로 API키가 없으면 포함하는게 맞을수도 있으나
        // 보통은 channels와 folders만 공유하면 충분합니다.
        
        const jsonStr = JSON.stringify(shareData);
        // UTF-8 Base64 Encoding
        const b64 = window.btoa(unescape(encodeURIComponent(jsonStr)));
        // URL Safe Encoding (+ 기호 등을 %2B로 변환)
        const urlSafeB64 = encodeURIComponent(b64);
        
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const shareUrl = `${origin}${pathname}?share=${urlSafeB64}`;

        navigator.clipboard.writeText(shareUrl).then(() => {
            alert("✅ 공유용 링크가 복사되었습니다!\n\n시크릿 모드나 다른 브라우저에서도 동일한 화면을 볼 수 있습니다.");
        }).catch(err => {
            console.error('Clipboard failed', err);
            prompt("아래 링크를 복사하세요:", shareUrl);
        });
    } catch (e) {
        alert("링크 생성 중 오류가 발생했습니다.");
        console.error(e);
    }
  };

  const handleDragStart = (e: React.DragEvent, channelId: string) => {
    e.dataTransfer.setData('channelId', channelId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (dragOverFolderId !== folderId) setDragOverFolderId(folderId);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const channelId = e.dataTransfer.getData('channelId');
    if (channelId) moveChannel(channelId, targetFolderId);
  };

  return (
    <div className="w-80 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-20 font-sans">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <Youtube className="text-red-600" size={32} />
          <h1 className="font-bold text-lg tracking-tight text-slate-900 leading-tight">Cycle Youtube<br/>Analytics</h1>
        </div>
        
        <button
            onClick={refreshData}
            disabled={!apiKey}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md mb-4 disabled:opacity-50"
        >
            <RefreshCw size={18} />
            데이터 새로고침
        </button>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Plus size={16} className="text-slate-700" />
                채널 추가
            </h2>
            <form onSubmit={handleAddChannel} className="space-y-3">
                <input
                    type="text"
                    value={newChannelInput}
                    onChange={(e) => setNewChannelInput(e.target.value)}
                    placeholder="핸들(@name) 또는 ID"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                />
                <button
                    type="submit"
                    disabled={isAddingChannel || !apiKey}
                    className="w-full bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isAddingChannel ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span>추가하기</span>}
                </button>
            </form>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto space-y-6">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FolderPlus size={16} className="text-slate-700" />
                폴더 관리
            </h2>
            <form onSubmit={handleAddFolder} className="flex gap-2">
                <input
                    type="text"
                    value={newFolderInput}
                    onChange={(e) => setNewFolderInput(e.target.value)}
                    placeholder="새 폴더명"
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                />
                <button type="submit" className="px-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-bold">
                    <Plus size={18} />
                </button>
            </form>
        </div>

        <div>
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 text-[10px]">채널 리스트</h2>
            <div className="space-y-2">
                <button
                    onClick={() => { setSelectedFolderId(null); setSelectedChannelId(null); }}
                    className={`w-full text-left px-3 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${
                        selectedFolderId === null ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100 bg-white border border-slate-100'
                    }`}
                >
                    <FolderIcon size={18} className={selectedFolderId === null ? "text-blue-200" : "text-slate-400"} />
                    <span>전체 보기</span>
                </button>

                {folders.map(folder => {
                    const isFolderSelected = selectedFolderId === folder.id;
                    const folderChannels = channels.filter(c => c.folderId === folder.id);
                    return (
                        <div key={folder.id} className={`rounded-xl border transition-all ${isFolderSelected ? 'bg-slate-50 border-blue-200' : 'bg-white border-slate-100'}`}>
                            <button
                                onClick={() => setSelectedFolderId(folder.id)}
                                onDragOver={(e) => handleDragOver(e, folder.id)}
                                onDrop={(e) => handleDrop(e, folder.id)}
                                className={`w-full text-left px-3 py-3 rounded-lg text-sm font-bold flex items-center gap-3 transition-colors ${
                                    isFolderSelected ? 'text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                                } ${dragOverFolderId === folder.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                            >
                                {isFolderSelected ? <ChevronDown size={16} /> : <ChevronRight size={16} className="text-slate-400" />}
                                <span className="truncate flex-1">{folder.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isFolderSelected ? 'bg-blue-200 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                                    {folderChannels.length}
                                </span>
                            </button>
                            {isFolderSelected && (
                                <div className="px-2 pb-2 space-y-1">
                                    {folderChannels.map(channel => (
                                        <div 
                                            key={channel.id} 
                                            onClick={(e) => { e.stopPropagation(); setSelectedChannelId(channel.id); }}
                                            draggable={true}
                                            onDragStart={(e) => handleDragStart(e, channel.id)}
                                            className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all ${
                                                selectedChannelId === channel.id ? 'bg-blue-100 border-blue-200 shadow-sm' : 'hover:bg-white border-transparent'
                                            }`}
                                        >
                                            <GripVertical size={14} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                                            <img src={channel.thumbnail} alt={channel.title} className="w-6 h-6 rounded-full bg-slate-200" />
                                            <p className={`text-xs font-semibold truncate flex-1 ${selectedChannelId === channel.id ? 'text-blue-800' : 'text-slate-800'}`}>{channel.title}</p>
                                            <button onClick={(e) => { e.stopPropagation(); deleteChannel(channel.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 space-y-2">
          <button 
              onClick={handleShareConfig}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-bold text-xs"
          >
              <Share2 size={14} />
              팀원에게 대시보드 공유
          </button>
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400">
              <a href="https://console.cloud.google.com/apis/enabled/youtube.googleapis.com/quotas" target="_blank" className="hover:text-blue-600 flex items-center gap-1">
                  <BarChart3 size={12} /> 할당량 확인 <ExternalLink size={10} />
              </a>
          </div>
      </div>
    </div>
  );
};

export default Sidebar;
