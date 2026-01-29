import React from 'react';
import { Video, SortOption } from '../types';
import { ExternalLink, ThumbsUp, MessageCircle, Eye } from 'lucide-react';

interface VideoTableProps {
  videos: Video[];
  sortOption: SortOption;
  setSortOption: (opt: SortOption) => void;
}

const VideoTable: React.FC<VideoTableProps> = ({ videos, sortOption, setSortOption }) => {

  const sortedVideos = [...videos].sort((a, b) => {
    switch (sortOption) {
      case SortOption.VIEWS_DESC:
        return b.viewCount - a.viewCount;
      case SortOption.LIKES_DESC:
        return b.likeCount - a.likeCount;
      case SortOption.COMMENTS_DESC:
        return b.commentCount - a.commentCount;
      case SortOption.DATE_DESC:
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      default:
        return 0;
    }
  });

  const SortButton = ({ label, option }: { label: string; option: SortOption }) => (
    <button
      onClick={() => setSortOption(option)}
      className={`flex items-center space-x-1 text-xs font-semibold uppercase tracking-wider ${
        sortOption === option ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <span>{label}</span>
      {sortOption === option && <div className="w-1 h-1 rounded-full bg-blue-600" />}
    </button>
  );

  if (videos.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-sm">
        <p>선택한 조건에 맞는 최근 7일 내 영상이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
        <h3 className="font-semibold text-slate-800">최근 업로드 영상</h3>
        <div className="flex gap-4">
            <SortButton label="조회수" option={SortOption.VIEWS_DESC} />
            <SortButton label="좋아요" option={SortOption.LIKES_DESC} />
            <SortButton label="댓글" option={SortOption.COMMENTS_DESC} />
            <SortButton label="날짜" option={SortOption.DATE_DESC} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 font-semibold">영상</th>
              <th className="px-6 py-3 font-semibold">게시일</th>
              <th className="px-6 py-3 font-semibold text-right">조회수</th>
              <th className="px-6 py-3 font-semibold text-right">좋아요</th>
              <th className="px-6 py-3 font-semibold text-right">댓글</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedVideos.map((video) => (
              <tr key={video.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0 w-24 h-14 bg-slate-200 rounded overflow-hidden">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                      {video.isShort && (
                        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">쇼츠</span>
                      )}
                    </div>
                    <div className="min-w-0 max-w-xs">
                        <div className="text-xs text-slate-500 mb-0.5">{video.channelTitle}</div>
                        <a 
                            href={`https://www.youtube.com/watch?v=${video.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-slate-900 hover:text-blue-600 truncate block flex items-center gap-1"
                        >
                            <span className="truncate">{video.title}</span>
                            <ExternalLink size={12} className="flex-shrink-0 opacity-50" />
                        </a>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500 whitespace-nowrap">
                  {new Date(video.publishedAt).toLocaleDateString('ko-KR')}
                  <div className="text-xs text-slate-400">{new Date(video.publishedAt).toLocaleTimeString('ko-KR', {hour: '2-digit', minute:'2-digit'})}</div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-700">
                  {video.viewCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-700">
                  <div className="flex items-center justify-end gap-1.5 text-rose-600">
                    <ThumbsUp size={14} />
                    {video.likeCount.toLocaleString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium text-slate-700">
                   <div className="flex items-center justify-end gap-1.5 text-blue-600">
                    <MessageCircle size={14} />
                    {video.commentCount.toLocaleString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VideoTable;