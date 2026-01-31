import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getCurrencySymbol } from '../utils/currency';
import { Wallet, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight, Activity, PieChart } from 'lucide-react';

export default function Dashboard() {
    const { t, i18n } = useTranslation();
    const [stats, setStats] = useState({
        net_worth: 0,
        total_pnl: 0,
        daily_pnl: 0,
        total_pnl_percent: 0,
        daily_pnl_percent: 0,
        stock_count: 0
    });
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currencySymbol, setCurrencySymbol] = useState(getCurrencySymbol());

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await axios.get('/api/portfolio/stats');
                setStats(statsRes.data);

                const chartRes = await axios.get('/api/portfolio/chart');
                setChartData(chartRes.data);
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        const handleCurrencyChange = () => setCurrencySymbol(getCurrencySymbol());
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
    }, []);

    const formatValue = (value) => {
        const sign = value >= 0 ? '' : '-';
        return `${sign}${currencySymbol}${Math.abs(value).toFixed(2)}`;
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-10 animate-fade-in">
            <header>
                <h2 className="text-4xl font-extrabold text-white tracking-tight">{t('dashboard.title')}</h2>
                <p className="text-gray-500 mt-2 font-medium">{t('dashboard.subtitle')}</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title={t('dashboard.net_worth')}
                    value={`${currencySymbol}${stats.net_worth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    change={`${stats.total_pnl_percent >= 0 ? '+' : ''}${stats.total_pnl_percent.toFixed(2)}%`}
                    isPositive={stats.total_pnl_percent >= 0}
                    icon={<Wallet className="text-blue-400" size={24} />}
                />
                <StatCard
                    title={t('dashboard.total_pnl')}
                    value={formatValue(stats.total_pnl)}
                    change={`${stats.total_pnl_percent >= 0 ? '+' : ''}${stats.total_pnl_percent.toFixed(2)}%`}
                    isPositive={stats.total_pnl >= 0}
                    icon={<TrendingUp className={stats.total_pnl >= 0 ? "text-red-400" : "text-green-400"} size={24} />}
                />
                <StatCard
                    title={t('dashboard.daily_pnl')}
                    value={formatValue(stats.daily_pnl)}
                    change={`${stats.daily_pnl_percent >= 0 ? '+' : ''}${stats.daily_pnl_percent.toFixed(2)}%`}
                    isPositive={stats.daily_pnl >= 0}
                    icon={<Activity className={stats.daily_pnl >= 0 ? "text-red-400" : "text-green-400"} size={24} />}
                />
                <StatCard
                    title={t('dashboard.stock_count') || "持有股票数"}
                    value={stats.stock_count.toString()}
                    change={`${stats.stock_count > 0 ? '+' : ''}${stats.stock_count}`}
                    isPositive={stats.stock_count > 0}
                    icon={<PieChart className="text-orange-400" size={24} />}
                />
            </div>

            <div className="glass-card p-8 rounded-3xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl">
                            <BarChart3 className="text-purple-400" size={20} />
                        </div>
                        <h3 className="text-xl font-bold text-white">{t('dashboard.history')}</h3>
                    </div>
                </div>

                <div className="h-96 w-full mb-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#475569"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#64748b' }}
                                tickFormatter={(val) => val.split('-').slice(1).join('/')}
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${currencySymbol}${val}`}
                                tick={{ fill: '#64748b' }}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className="glass-card p-4 rounded-xl border border-white/10 shadow-2xl">
                                                <div className="flex flex-col gap-0.5 mb-2">
                                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">{label}</span>
                                                    <span className="text-blue-400 text-[8px] font-bold uppercase">
                                                        {new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(data.date))}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex justify-between items-end gap-8">
                                                        <span className="text-gray-500 text-xs">{t('dashboard.net_worth')}</span>
                                                        <span className="text-xs font-mono font-bold text-white">
                                                            {currencySymbol}{data.market_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-end gap-8">
                                                        <span className="text-gray-500 text-xs">{t('dashboard.total_pnl')}</span>
                                                        <span className={`text-sm font-mono font-bold ${data.pnl >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                            {data.pnl >= 0 ? '' : '-'}{currencySymbol}{Math.abs(data.pnl).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                                cursor={{ stroke: '#8b5cf6', strokeWidth: 1, strokeDasharray: '4 4' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="pnl"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorPnl)"
                                activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
                                name={t('dashboard.total_pnl')}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="mt-8">
                    <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 border-b border-white/5 pb-4">
                        {t('dashboard.daily_details') || "每日明细"}
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-white/5">
                                    <th className="pb-4">{t('stock_detail.date')}</th>
                                    <th className="pb-4 text-right">{t('dashboard.net_worth')}</th>
                                    <th className="pb-4 text-right">{t('dashboard.daily_pnl')}</th>
                                    <th className="pb-4 text-right">{t('dashboard.total_pnl')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {[...chartData].reverse().map((day, idx) => (
                                    <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-gray-300 font-medium">{day.date}</span>
                                                <span className="text-[10px] text-gray-500 font-bold uppercase">
                                                    {new Intl.DateTimeFormat(i18n.language, { weekday: 'short' }).format(new Date(day.date))}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-right font-mono text-white">
                                            {currencySymbol}{day.market_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className={`py-4 text-right font-mono font-bold ${day.daily_change >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {day.daily_change >= 0 ? '' : '-'}{currencySymbol}{Math.abs(day.daily_change).toFixed(2)}
                                        </td>
                                        <td className={`py-4 text-right font-mono font-bold ${day.pnl >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                            {day.pnl >= 0 ? '' : '-'}{currencySymbol}{Math.abs(day.pnl).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, change, isPositive, icon }) {
    return (
        <div className="glass-card p-6 rounded-3xl group hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-start justify-between">
                <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-white/10 transition-colors">
                    {icon}
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                    {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {change}
                </div>
            </div>
            <div className="mt-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
                <p className="text-3xl font-mono font-bold text-white mt-1 tracking-tighter">{value}</p>
            </div>
        </div>
    );
}
