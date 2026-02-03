
import React, { useMemo } from 'react';
import { Video, Channel } from '../types';
import { BarChart3, Clock, Calendar, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ChannelStatsProps {
  videos: Video[];
  channel?: Channel; // 단일 채널 선택 시 정보
}

const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  const hours = (parseInt(match[1] || '0') || 0);
  const minutes = (parseInt(match[2] || '0') || 0);
  const seconds = (parseInt(match[3] || '0') || 0);
  return hours * 3600 + minutes * 60 + seconds;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const min = Math.floor(seconds / 60);
  return `${min} min`;
};

const ChannelStats: React.FC<ChannelStatsProps> = ({ videos, channel }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    // 1. 최근 7일 영상
    const last7dVideos = videos.filter(v => new Date(v.publishedAt) >= sevenDaysAgo);
    const views7d = last7dVideos.reduce((acc, v) => acc + v.viewCount, 0);

    // 2. 이전 7일 (8~14일 전) 영상
    const prev7dVideos = videos.filter(v => {
      const d = new Date(v.publishedAt);
      return d >= fourteenDaysAgo && d < sevenDaysAgo;
    });
    const viewsPrev7d = prev7dVideos.reduce((acc, v) => acc + v.viewCount, 0);

    // 3. 증감률
    let growthRate = 0;
    if (viewsPrev7d > 0) {
      growthRate = ((views7d - viewsPrev7d) / viewsPrev7d) * 100;
    } else if (views7d > 0) {
      growthRate = 100; // 이전 데이터가 없는데 이번에 있으면 100% (혹은 Infinity)
    }

    // 4. 업로드 빈도 (최근 30일 기준)
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const last30dVideos = videos.filter(v => new Date(v.publishedAt) >= thirtyDaysAgo);
    const uploadCount = last30dVideos.length;
    let frequencyText = "";
    if (uploadCount === 0) frequencyText = "No recent uploads";
    else if (uploadCount >= 4) frequencyText = `~${Math.round(uploadCount / 4)} uploads per week`;
    else frequencyText = `~${uploadCount} uploads per month`;

    // 5. 평균 길이
    const totalDuration = videos.reduce((acc, v) => acc + parseDuration(v.duration), 0);
    const avgDuration = videos.length > 0 ? totalDuration / videos.length : 0;

    // 6. 구독자 수 (단일 채널일 경우만)
    const subCount = channel ? parseInt(channel.subscriberCount || '0') : 0;
    const formatSub = (num: number) => {
        if(num >= 10000) return `${(num/10000).toFixed(1)}만`;
        if(num >= 1000) return `${(num/1000).toFixed(1)}천`;
        return num.toLocaleString();
    };

    return {
      views7d,
      growthRate,
      frequencyText,
      avgDurationText: formatDuration(avgDuration),
      subCountText: subCount > 0 ? formatSub(subCount) : '-',
    };
  }, [videos, channel]);

  return (
    <div className="bg-[#1f2937] text-white rounded-xl shadow-lg p-4 mb-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-[#3b82f6] p-1 rounded">
            <BarChart3 size={16} className="text-white" />
        </div>
        <h3 className="font-bold text-sm">Quick channel stats</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-600">
        
        {/* Views Gained (7 days) */}
        <div className="px-4 py-2 first:pl-0">
          <p className="text-xs text-slate-400 mb-1">New Video Views (7 days)</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">+{stats.views7d.toLocaleString()}</span>
            <div className={`text-xs px-1.5 py-0.5 rounded flex items-center ${stats.growthRate >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {stats.growthRate >= 0 ? <TrendingUp size={10} className="mr-1"/> : <TrendingDown size={10} className="mr-1"/>}
                {Math.abs(stats.growthRate).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Upload Frequency */}
        <div className="px-4 py-2">
          <p className="text-xs text-slate-400 mb-1">Upload frequency</p>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-slate-500" />
            <span className="text-lg font-bold">{stats.frequencyText}</span>
          </div>
        </div>

        {/* Avg Video Length */}
        <div className="px-4 py-2">
          <p className="text-xs text-slate-400 mb-1">Avg. video length</p>
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-500" />
            <span className="text-lg font-bold">{stats.avgDurationText}</span>
          </div>
        </div>

        {/* Subscribers */}
        <div className="px-4 py-2">
          <p className="text-xs text-slate-400 mb-1">Subscribers</p>
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <span className="text-lg font-bold">{stats.subCountText}</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChannelStats;
