import React, { useState, useMemo } from 'react';
import { Video, SortOption, Folder, Channel, AnalysisPeriod } from '../types';
import VideoTable from './VideoTable';
import { Eye, ThumbsUp, MessageCircle, Film } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface DashboardProps {
  videos: Video[];
  channels: Channel[];
  selectedFolderId: string | null;
  selectedChannelId: string | null;
  folders: Folder[];
  isLoading: boolean;
  period: AnalysisPeriod;
  setPeriod: (period: AnalysisPeriod) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
    videos, 
    channels, 
    selectedFolderId, 
    selectedChannelId, 
    folders, 
    isLoading,
    period,
    setPeriod
}) => {
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.VIEWS_DESC);

  const scopeVideos = useMemo(() => {
    if (selectedChannelId) {
        return videos.filter(v => v.channelId === selectedChannelId);
    }
    if (selectedFolderId) {
        const folderChannelIds = channels.filter(c => c.folderId === selectedFolderId).map(c => c.id);
        return videos.filter(v => folderChannelIds.includes(v.channelId));
    }
    return videos;
  }, [videos, selectedFolderId, selectedChannelId, channels]);

  const filteredVideos = useMemo(() => {
    // 숏폼을 완전히 제외하고 롱폼(일반 영상)만 필터링
    return scopeVideos.filter(v => !v.isShort);
  }, [scopeVideos]);

  const stats = useMemo(() => {
    const count = filteredVideos.length;
    if (count === 0) {
        return { count: 0, avgViews: 0, avgLikes: 0, avgComments: 0 };
    }

    const totalViews = filteredVideos.reduce((acc, v) => acc + v.viewCount, 0);
    const totalLikes = filteredVideos.reduce((acc, v) => acc + v.likeCount, 0);
    const totalComments = filteredVideos.reduce((acc, v) => acc + v.commentCount, 0);

    return {
      count,
      avgViews: Math.round(totalViews / count),
      avgLikes: Math.round(totalLikes / count),
      avgComments: Math.round(totalComments / count),
    };
  }, [filteredVideos]);

  const chartData = useMemo(() => {
      // 영상 기준 조회수 내림차순 정렬 후 상위 5개
      return [...filteredVideos]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 5)
        .map(v => ({
            name: v.title.length > 12 ? v.title.substring(0, 12) + '...' : v.title, // 축 표시용 짧은 제목
            fullTitle: v.title, // 툴팁용 전체 제목
            views: v.viewCount,
            id: v.id, // 링크 이동용 ID
            channel: v.channelTitle
        }));
  }, [filteredVideos]);

  const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string, icon: any, color: string }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
        <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
    </div>
  );

  let viewTitle = "전체 채널";
  if (selectedChannelId) {
      const ch = channels.find(c => c.id === selectedChannelId);
      if (ch) viewTitle = ch.title;
  } else if (selectedFolderId) {
      const f = folders.find(f => f.id === selectedFolderId);
      if (f) viewTitle = f.name;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{viewTitle} 성과 분석</h1>
                <p className="text-slate-500 text-sm mt-1">최근 {period}일 데이터 분석 중 (숏폼 제외)</p>
            </div>
            {/* 기간 선택 토글 */}
            <div className="flex items-center bg-slate-200 p-1 rounded-lg ml-2">
                {[7, 30].map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p as AnalysisPeriod)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                            period === p ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {p}일
                    </button>
                ))}
            </div>
        </div>
        
        {/* 숏폼 필터 버튼 제거됨 */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="영상 수" value={stats.count.toLocaleString()} icon={Film} color="bg-slate-600 text-slate-600" />
        <StatCard label="평균 조회수" value={stats.avgViews.toLocaleString()} icon={Eye} color="bg-blue-600 text-blue-600" />
        <StatCard label="평균 좋아요" value={stats.avgLikes.toLocaleString()} icon={ThumbsUp} color="bg-rose-600 text-rose-600" />
        <StatCard label="평균 댓글" value={stats.avgComments.toLocaleString()} icon={MessageCircle} color="bg-indigo-600 text-indigo-600" />
      </div>

      {/* TOP 5 영상 차트 */}
      {filteredVideos.length > 0 && (
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <Eye size={18} className="text-blue-600" />
                조회수 TOP 5 영상
                <span className="text-xs font-normal text-slate-400 ml-auto">클릭하여 영상 바로가기</span>
            </h3>
            <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={chartData} 
                        layout="vertical"
                        margin={{ left: 10, right: 30, top: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={100} 
                            tick={{fontSize: 12, fill: '#64748b'}} 
                            axisLine={false} 
                            tickLine={false} 
                        />
                        <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg z-50 max-w-xs">
                                        <p className="font-bold text-sm text-slate-900 mb-1 break-keep leading-tight">{data.fullTitle}</p>
                                        <p className="text-xs text-slate-500 mb-2">{data.channel}</p>
                                        <div className="flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-bold">
                                                {data.views.toLocaleString()}회
                                            </span>
                                            <span className="text-[10px] text-slate-400">클릭하여 이동 ↗</span>
                                        </div>
                                    </div>
                                );
                                }
                                return null;
                            }}
                        />
                        <Bar 
                            dataKey="views" 
                            fill="#3b82f6" 
                            radius={[0, 4, 4, 0]} 
                            barSize={24}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(data) => {
                                window.open(`https://www.youtube.com/watch?v=${data.id}`, '_blank');
                            }}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
         </div>
      )}

      <VideoTable videos={filteredVideos} sortOption={sortOption} setSortOption={setSortOption} period={period} />
      
      {isLoading && (
          <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;