
import React, { useMemo } from 'react';
import { AnalyticsDataPoint } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from 'recharts';
import { DollarSign, Users, Eye, Clock, AlertTriangle } from 'lucide-react';

interface MyAnalyticsDashboardProps {
    data: AnalyticsDataPoint[];
    period: number;
}

const MyAnalyticsDashboard: React.FC<MyAnalyticsDashboardProps> = ({ data, period }) => {
    
    const summary = useMemo(() => {
        return data.reduce((acc, curr) => ({
            totalViews: acc.totalViews + curr.views,
            totalRevenue: acc.totalRevenue + curr.estimatedRevenue,
            totalSubscribersGained: acc.totalSubscribersGained + curr.subscribersGained,
            totalWatchTimeHours: acc.totalWatchTimeHours + (curr.estimatedMinutesWatched / 60)
        }), { totalViews: 0, totalRevenue: 0, totalSubscribersGained: 0, totalWatchTimeHours: 0 });
    }, [data]);

    const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-3 opacity-10 ${color.text}`}>
                <Icon size={48} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    );

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-900">데이터가 없습니다</h2>
                <p className="text-slate-500 mt-2 max-w-md">
                    최근 {period}일 간의 Analytics 데이터를 불러올 수 없습니다.<br/>
                    채널에 동영상이 없거나, 아직 데이터가 집계되지 않았을 수 있습니다.
                </p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    내 채널 스튜디오 분석
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Private</span>
                </h1>
                <p className="text-slate-500 text-sm mt-1">최근 {period}일간의 수익 및 상세 성과 지표입니다.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    title="추정 수익" 
                    value={`$${summary.totalRevenue.toFixed(2)}`} 
                    sub="최근 집계 기준"
                    icon={DollarSign} 
                    color={{ text: 'text-green-600', bg: 'bg-green-600' }}
                />
                <StatCard 
                    title="총 조회수" 
                    value={summary.totalViews.toLocaleString()} 
                    icon={Eye} 
                    color={{ text: 'text-blue-600', bg: 'bg-blue-600' }}
                />
                <StatCard 
                    title="구독자 증가" 
                    value={`${summary.totalSubscribersGained > 0 ? '+' : ''}${summary.totalSubscribersGained}`} 
                    icon={Users} 
                    color={{ text: 'text-purple-600', bg: 'bg-purple-600' }}
                />
                <StatCard 
                    title="시청 시간" 
                    value={`${Math.round(summary.totalWatchTimeHours).toLocaleString()}시간`} 
                    icon={Clock} 
                    color={{ text: 'text-orange-600', bg: 'bg-orange-600' }}
                />
            </div>

            {/* 수익 차트 (가장 중요) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <DollarSign size={18} className="text-green-600" />
                    일별 추정 수익 ($)
                </h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="date" 
                                tickFormatter={(val) => val.substring(5)} 
                                tick={{fontSize: 12, fill: '#94a3b8'}} 
                                axisLine={false} 
                                tickLine={false} 
                            />
                            <YAxis 
                                tick={{fontSize: 12, fill: '#94a3b8'}} 
                                axisLine={false} 
                                tickLine={false}
                                tickFormatter={(val) => `$${val}`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`$${value.toFixed(2)}`, '수익']}
                                labelFormatter={(label) => label}
                            />
                            <Bar dataKey="estimatedRevenue" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 조회수 차트 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Eye size={18} className="text-blue-600" />
                        일별 조회수 추이
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 구독자 차트 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Users size={18} className="text-purple-600" />
                        일별 구독자 획득
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" tickFormatter={(val) => val.substring(5)} tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Line type="monotone" dataKey="subscribersGained" stroke="#9333ea" strokeWidth={2} dot={{r: 3}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyAnalyticsDashboard;
