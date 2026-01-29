import React, { useState } from 'react';
import { Folder, Channel } from '../types';
import { Plus, Trash2, FolderPlus, Youtube, RefreshCw, Key, Folder as FolderIcon } from 'lucide-react';

interface SidebarProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  folders: Folder[];
  channels: Channel[];
  selectedFolderId: string | null;
  setSelectedFolderId: (id: string | null) => void;
  addFolder: (name: string) => void;
  addChannel: (identifier: string, folderId: string) => Promise<void>;
  deleteChannel: (id: string) => void;
  refreshData: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  apiKey,
  setApiKey,
  folders,
  channels,
  selectedFolderId,
  setSelectedFolderId,
  addFolder,
  addChannel,
  deleteChannel,
  refreshData
}) => {
  const [newFolderInput, setNewFolderInput] = useState('');
  const [newChannelInput, setNewChannelInput] = useState('');
  const [targetFolderId, setTargetFolderId] = useState<string>(folders[0]?.id || '');
  const [isAddingChannel, setIsAddingChannel] = useState(false);

  const handleAddFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderInput.trim()) {
      addFolder(newFolderInput.trim());
      setNewFolderInput('');
    }
  };

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelInput.trim() && targetFolderId) {
      setIsAddingChannel(true);
      await addChannel(newChannelInput.trim(), targetFolderId);
      setIsAddingChannel(false);
      setNewChannelInput('');
    }
  };

  return (
    <div className="w-80 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0 z-20 overflow-y-auto">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-6">
          <Youtube className="text-red-600" size={32} />
          <h1 className="font-bold text-lg tracking-tight text-slate-900 leading-tight">Cycle Youtube<br/>Analytics</h1>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                API 설정
            </label>
            <div className="relative">
                <Key size={14} className="absolute left-3 top-3 text-slate-400" />
                <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="YouTube API Key 입력"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
            </div>
          </div>
          
          <button
            onClick={refreshData}
            disabled={!apiKey}
            className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} />
            데이터 새로고침
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        <div className="mb-8">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">채널 추가</h2>
            <form onSubmit={handleAddChannel} className="space-y-3">
                <input
                    type="text"
                    value={newChannelInput}
                    onChange={(e) => setNewChannelInput(e.target.value)}
                    placeholder="핸들(@name) 또는 채널 ID"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                    {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
                <button
                    type="submit"
                    disabled={isAddingChannel || !apiKey}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isAddingChannel ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Plus size={16} />
                    )}
                    채널 추가
                </button>
            </form>
        </div>

        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">폴더 관리</h2>
            </div>
            <form onSubmit={handleAddFolder} className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newFolderInput}
                    onChange={(e) => setNewFolderInput(e.target.value)}
                    placeholder="새 폴더명"
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                >
                    <FolderPlus size={18} />
                </button>
            </form>

            <div className="space-y-1">
                <button
                    onClick={() => setSelectedFolderId(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                        selectedFolderId === null ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <FolderIcon size={16} />
                    전체 채널
                </button>
                {folders.map(folder => (
                    <button
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                            selectedFolderId === folder.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <FolderIcon size={16} />
                        <span className="truncate">{folder.name}</span>
                        <span className="ml-auto text-xs opacity-60 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">
                             {channels.filter(c => c.folderId === folder.id).length}
                        </span>
                    </button>
                ))}
            </div>
        </div>

        <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">채널 목록</h2>
             <div className="space-y-2">
                {channels
                    .filter(c => selectedFolderId ? c.folderId === selectedFolderId : true)
                    .map(channel => (
                    <div key={channel.id} className="group flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                        <img src={channel.thumbnail} alt={channel.title} className="w-8 h-8 rounded-full bg-slate-200" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{channel.title}</p>
                            <p className="text-xs text-slate-500 truncate">{channel.handle || channel.id}</p>
                        </div>
                        <button
                            onClick={() => deleteChannel(channel.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 transition-opacity"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
                {channels.length === 0 && (
                    <p className="text-sm text-slate-400 italic">아직 추가된 채널이 없습니다.</p>
                )}
             </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;