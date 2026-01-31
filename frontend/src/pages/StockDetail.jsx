import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Edit2, Trash2, Check, X, RefreshCw, TrendingUp, TrendingDown, Activity, DollarSign, PieChart, Clock } from 'lucide-react';
import TransactionForm from './components/TransactionForm';
import { getCurrencySymbol } from '../utils/currency';
import ManualQuoteForm from './components/ManualQuoteForm';
import ConfirmModal from './components/ConfirmModal';

export default function StockDetail() {
    const { t, i18n } = useTranslation();
    const { id } = useParams();
    const [currencySymbol, setCurrencySymbol] = useState(getCurrencySymbol());
    const [stock, setStock] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [quotes, setQuotes] = useState([]);
    const [timeline, setTimeline] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
    const [updating, setUpdating] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);

    useEffect(() => {
        fetchData();
    }, [id]);

    useEffect(() => {
        const handleCurrencyChange = () => {
            setCurrencySymbol(getCurrencySymbol());
        };
        window.addEventListener('currencyChange', handleCurrencyChange);
        return () => window.removeEventListener('currencyChange', handleCurrencyChange);
    }, []);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData();
        }, 60000);

        return () => clearInterval(interval);
    }, [id]);

    const fetchData = async () => {
        try {
            const stockRes = await axios.get(`/api/stocks/${id}`);
            const analysisRes = await axios.get(`/api/stocks/${id}/analysis`);
            const quotesRes = await axios.get(`/api/quotes/${id}`);
            const txRes = await axios.get(`/api/stocks/${id}/transactions`);

            setStock(stockRes.data);
            setAnalysis(analysisRes.data.snapshot);
            setTimeline(analysisRes.data.timeline);
            setQuotes(quotesRes.data);
            setTransactions(txRes.data);
            setLastUpdate(new Date());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleManualUpdate = async () => {
        setUpdating(true);
        try {
            await axios.post('/api/quotes/manual-update');
            toast.success(t('stock_detail.update_success') || "行情已更新");
            await fetchData();
        } catch (err) {
            console.error(err);
            toast.error(t('stock_detail.update_failed') || "更新失败");
        } finally {
            setUpdating(false);
        }
    };

    const handleEdit = (tx) => {
        setEditingId(tx.id);
        setEditForm({
            type: tx.type,
            date: tx.date,
            price: tx.price,
            quantity: tx.quantity,
            fees: tx.fees
        });
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSaveEdit = async (txId) => {
        try {
            await axios.put(`/api/transactions/${txId}`, {
                ...editForm,
                price: parseFloat(editForm.price),
                quantity: parseFloat(editForm.quantity),
                fees: parseFloat(editForm.fees || 0)
            });
            setEditingId(null);
            setEditForm({});
            toast.success(t('stock_detail.update_success') || "已更新");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error(t('stock_detail.update_failed') || "更新失败");
        }
    };

    const handleDelete = async (txId) => {
        setConfirmDelete({ show: true, id: txId });
    };

    const proceedDelete = async () => {
        const txId = confirmDelete.id;
        try {
            await axios.delete(`/api/transactions/${txId}`);
            toast.success(t('stock_detail.delete_success') || "记录已删除");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error(t('stock_detail.error_delete') || "删除失败");
        } finally {
            setConfirmDelete({ show: false, id: null });
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
    );
    if (!stock) return <div className="p-8 text-white">{t('stocks.empty')}</div>;

    const currentPrice = analysis?.current_price || 0;
    const isPriceUp = quotes.length >= 2 ? quotes[quotes.length - 1].close >= quotes[quotes.length - 2].close : true;

    return (
        <>
            <div className="space-y-8 animate-fade-in">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h2 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                            {stock.name}
                            <span className="text-xl font-mono text-gray-500 bg-gray-800/50 px-3 py-1 rounded-lg border border-gray-700">
                                {stock.symbol}
                            </span>
                        </h2>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-bold rounded uppercase tracking-wider border border-blue-500/20">
                                {t(`stocks.market_types.${stock.market}`) || stock.market}
                            </span>
                            {lastUpdate && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock size={12} /> {lastUpdate.toLocaleTimeString()}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="glass-card px-6 py-4 rounded-2xl flex items-center gap-6 border-l-4 border-l-blue-500">
                        <div className="text-right">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{t('stock_detail.current_price')}</p>
                            <p className={`text-3xl font-mono font-bold ${isPriceUp ? 'text-red-400' : 'text-green-400'}`}>
                                {currentPrice > 0 ? `${currencySymbol}${currentPrice.toFixed(2)}` : t('stock_detail.no_price_data')}
                            </p>
                        </div>
                        <button
                            onClick={handleManualUpdate}
                            disabled={updating}
                            className={`p-3 rounded-xl bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 transition-all ${updating ? 'animate-spin text-blue-400' : 'text-gray-400'}`}
                        >
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <DetailCard
                        label={t('stock_detail.avg_cost')}
                        value={analysis?.avg_cost}
                        prefix={currencySymbol}
                        subLabel={analysis?.holdings_qty > 0 ? t('stock_detail.cost_basis') : t('stock_detail.final_cost')}
                        icon={<DollarSign size={20} className="text-blue-400" />}
                    />
                    <DetailCard
                        label={t('stock_detail.holdings_qty')}
                        value={analysis?.holdings_qty}
                        subLabel={analysis?.holdings_qty > 0 ? t('stock_detail.in_wallet') : t('stock_detail.empty_holdings')}
                        icon={<Activity size={20} className="text-purple-400" />}
                    />
                    <DetailCard
                        label={t('stock_detail.market_value')}
                        value={analysis?.market_value}
                        prefix={currencySymbol}
                        subLabel={analysis?.market_value > 0 ? t('stock_detail.market_value_equity') : t('stock_detail.empty_holdings')}
                        icon={<PieChart size={20} className="text-amber-400" />}
                    />
                    <DetailCard
                        label={t('stock_detail.realized_pnl')}
                        value={analysis?.realized_pnl}
                        prefix={currencySymbol}
                        subLabel={t('stock_detail.realized_pnl_desc')}
                        isPnl
                        icon={analysis?.realized_pnl >= 0 ? <Check size={20} className="text-red-400" /> : <X size={20} className="text-green-400" />}
                    />
                    <DetailCard
                        label={t('stock_detail.total_pnl')}
                        value={(analysis?.unrealized_pnl || 0) + (analysis?.realized_pnl || 0)}
                        prefix={currencySymbol}
                        subLabel={t('stock_detail.total_pnl_desc')}
                        isPnl
                        icon={(analysis?.unrealized_pnl || 0) + (analysis?.realized_pnl || 0) >= 0 ? <TrendingUp size={20} className="text-red-400" /> : <TrendingDown size={20} className="text-green-400" />}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Chart & Table */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Chart Card */}
                        <div className="glass-card p-6 rounded-3xl overflow-hidden relative">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Activity className="text-blue-400" size={20} />
                                    {t('stock_detail.price_history')}
                                </h3>
                                {quotes && quotes.length > 0 && (
                                    <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
                                        <div className="flex flex-col items-end">
                                            <span className="text-gray-500 font-bold tracking-widest">{t('stock_detail.high')}</span>
                                            <span className="text-red-400">{currencySymbol}{quotes[quotes.length - 1].high?.toFixed(2)}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-gray-500 font-bold tracking-widest">{t('stock_detail.low')}</span>
                                            <span className="text-green-400">{currencySymbol}{quotes[quotes.length - 1].low?.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={timeline.length > 0 ? timeline : quotes}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                        <XAxis
                                            dataKey="date"
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => val.split('-').slice(1).join('/')}
                                        />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            stroke="#475569"
                                            fontSize={10}
                                            tickLine={false}
                                            axisLine={false}
                                            tickFormatter={(val) => `${currencySymbol}${val}`}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (active && payload && payload.length) {
                                                    const data = payload[0].payload;
                                                    const isProfit = data.unrealized_pnl >= 0;
                                                    const hasTimeline = data.avg_cost !== undefined;

                                                    return (
                                                        <div className="glass-card p-4 rounded-xl border border-white/10 shadow-2xl">
                                                            <div className="flex flex-col gap-0.5 mb-2">
                                                                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{label}</p>
                                                                <p className="text-blue-400 text-[8px] font-bold uppercase">
                                                                    {new Intl.DateTimeFormat(i18n.language, { weekday: 'long' }).format(new Date(label))}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                                <div className="flex justify-between gap-8 text-sm">
                                                                    <span className="text-gray-500">{t('stock_detail.price')}</span>
                                                                    <span className="text-white font-mono font-bold">{currencySymbol}{data.close?.toFixed(2) || data.price?.toFixed(2)}</span>
                                                                </div>
                                                                {hasTimeline && (
                                                                    <>
                                                                        <div className="flex justify-between gap-8 text-sm">
                                                                            <span className="text-gray-500">{t('stock_detail.avg_cost')}</span>
                                                                            <span className="text-gray-300 font-mono">{currencySymbol}{data.avg_cost?.toFixed(2)}</span>
                                                                        </div>
                                                                        <div className="h-px bg-white/5 my-1" />
                                                                        <div className="flex justify-between gap-8 text-sm">
                                                                            <span className="text-gray-500">{t('stock_detail.unrealized_pnl')}</span>
                                                                            <span className={`font-mono font-bold ${isProfit ? 'text-red-400' : 'text-green-400'}`}>
                                                                                {isProfit ? '' : '-'}{currencySymbol}{Math.abs(data.unrealized_pnl || 0).toFixed(2)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex justify-between gap-8 text-[10px]">
                                                                            <span className="text-gray-500 font-bold tracking-widest">{t('stock_detail.pnl_percent')}</span>
                                                                            <span className={`font-mono ${isProfit ? 'text-red-400' : 'text-green-400'}`}>
                                                                                {isProfit ? '+' : ''}{data.unrealized_pnl_percent?.toFixed(1)}%
                                                                            </span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="close"
                                            stroke="#3b82f6"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorPrice)"
                                            dot={false}
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#60a5fa' }}
                                            name={t('stock_detail.close_price')}
                                        />
                                        <Line
                                            type="stepAfter"
                                            dataKey="avg_cost"
                                            stroke="#94a3b8"
                                            strokeDasharray="5 5"
                                            strokeWidth={2}
                                            dot={false}
                                            name={t('stock_detail.avg_cost')}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Transactions Table Card */}
                        <div className="glass-card p-6 rounded-3xl">
                            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                <Clock className="text-purple-400" size={20} />
                                {t('stock_detail.recent_transactions')}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-white/5">
                                            <th className="pb-4">{t('stock_detail.date')}</th>
                                            <th className="pb-4">{t('stock_detail.type')}</th>
                                            <th className="pb-4 text-right">{t('stock_detail.price')}</th>
                                            <th className="pb-4 text-right">{t('stock_detail.quantity')}</th>
                                            <th className="pb-4 text-right">{t('stock_detail.fees')}</th>
                                            <th className="pb-4 text-right">{t('stocks.table.action')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {transactions.map(tx => (
                                            <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
                                                {editingId === tx.id ? (
                                                    <td colSpan={6} className="py-2">
                                                        <div className="flex gap-2 p-2 bg-gray-900/50 rounded-xl">
                                                            <input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="form-input-styled rounded-lg px-2 py-1 text-xs w-28" />
                                                            <select value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })} className="form-input-styled rounded-lg px-2 py-1 text-xs w-20">
                                                                <option value="BUY">{t('stock_detail.buy')}</option>
                                                                <option value="SELL">{t('stock_detail.sell')}</option>
                                                                <option value="DIVIDEND_CASH">{t('stock_detail.dividend')}</option>
                                                            </select>
                                                            <input type="number" step="0.01" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className="form-input-styled rounded-lg px-2 py-1 text-xs flex-1" />
                                                            <input type="number" step="0.0001" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} className="form-input-styled rounded-lg px-2 py-1 text-xs flex-1" />
                                                            <input type="number" step="0.01" value={editForm.fees} onChange={e => setEditForm({ ...editForm, fees: e.target.value })} className="form-input-styled rounded-lg px-2 py-1 text-xs w-20" placeholder={t('stock_detail.fees')} />
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleSaveEdit(tx.id)} className="p-1.5 text-green-400 hover:bg-green-400/10 rounded-lg"><Check size={14} /></button>
                                                                <button onClick={handleCancelEdit} className="p-1.5 text-gray-400 hover:bg-gray-400/10 rounded-lg"><X size={14} /></button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                ) : (
                                                    <>
                                                        <td className="py-4 text-gray-400 font-medium">{tx.date}</td>
                                                        <td className="py-4">
                                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tx.type === 'BUY' ? 'bg-green-500/10 text-green-400' :
                                                                (tx.notes === 'CLOSE_POSITION' || tx.type === 'SELL' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400')
                                                                }`}>
                                                                {tx.notes === 'CLOSE_POSITION' ? t('stock_detail.close_position') : t(`stock_detail.${tx.type.toLowerCase()}`)}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-right font-mono text-white">{currencySymbol}{tx.price}</td>
                                                        <td className="py-4 text-right font-mono text-white">{tx.quantity}</td>
                                                        <td className="py-4 text-right font-mono text-gray-500">{currencySymbol}{tx.fees}</td>
                                                        <td className="py-4 text-right space-x-2">
                                                            <button onClick={() => handleEdit(tx)} className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Edit2 size={14} /></button>
                                                            <button onClick={() => handleDelete(tx.id)} className="p-2 text-red-500/50 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Add Form */}
                    <div className="lg:col-span-1">
                        <TransactionForm stockId={id} onSuccess={fetchData} analysis={analysis} />
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmDelete.show}
                onClose={() => setConfirmDelete({ ...confirmDelete, show: false })}
                onConfirm={proceedDelete}
                title={t('stock_detail.delete_tx_title') || "确认删除交易"}
                message={t('stock_detail.confirm_delete_tx') || "您确定要永久删除这条交易记录吗？此操作不可撤销。"}
                confirmText={t('stock_detail.delete_btn') || "确认删除"}
                type="danger"
            />
        </>
    );
}

function DetailCard({ label, value, prefix = "", isPnl = false, icon, subLabel }) {
    const val = parseFloat(value || 0);
    const formattedVal = val.toFixed(2);
    const isPositive = val >= 0;
    const isZero = Math.abs(val) < 0.0001;

    const colorClass = isPnl
        ? (isPositive ? 'text-red-400' : 'text-green-400')
        : (isZero ? 'text-gray-500' : 'text-white');

    return (
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
            <div className="absolute -right-2 -bottom-2 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                {icon}
            </div>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                    {subLabel && <p className="text-[8px] text-blue-400 font-bold uppercase mt-0.5">{subLabel}</p>}
                </div>
                <div className="p-2 bg-white/5 rounded-xl">
                    {icon}
                </div>
            </div>
            <p className={`text-2xl font-mono font-bold tracking-tighter ${colorClass}`}>
                {val >= 0 ? '' : '-'}{prefix}{Math.abs(val).toFixed(2)}
            </p>
        </div>
    );
}
