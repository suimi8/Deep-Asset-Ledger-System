import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit2, Trash2, ArrowRight, TrendingUp, Info, Activity } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import AddStockModal from './components/AddStockModal';
import ConfirmModal from './components/ConfirmModal';

export default function StockList() {
    const { t } = useTranslation();
    const [stocks, setStocks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [showModal, setShowModal] = useState(false);
    const [editingStock, setEditingStock] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null, symbol: '' });

    useEffect(() => {
        fetchStocks();
    }, []);

    const fetchStocks = async () => {
        try {
            const res = await axios.get('/api/stocks');
            setStocks(res.data);
        } catch (err) {
            console.error("Failed to fetch stocks", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, symbol) => {
        setConfirmDelete({ show: true, id, symbol });
    };

    const proceedDelete = async () => {
        const { id } = confirmDelete;
        try {
            await axios.delete(`/api/stocks/${id}`);
            toast.success(t('stocks.delete_success') || "股票已删除");
            fetchStocks();
        } catch (err) {
            toast.error(t('stocks.delete_failed') || "删除失败");
        }
    };

    const openAddModal = () => {
        setEditingStock(null);
        setShowModal(true);
    };

    const openEditModal = (stock) => {
        setEditingStock(stock);
        setShowModal(true);
    };

    return (
        <>
            <div className="space-y-10 animate-fade-in">
                <header className="flex justify-between items-end">
                    <div>
                        <h2 className="text-4xl font-extrabold text-white tracking-tight">{t('stocks.title')}</h2>
                        <p className="text-gray-500 mt-2 font-medium">{t('stocks.subtitle')}</p>
                    </div>
                    <button
                        onClick={openAddModal}
                        className="btn-primary flex items-center gap-2 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-blue-500/20"
                    >
                        <Plus size={20} />
                        <span>{t('stocks.add_button')}</span>
                    </button>
                </header>

                <div className="glass-card rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em] border-b border-white/5 bg-white/[0.01]">
                                    <th className="px-8 py-5">{t('stocks.table.symbol')}</th>
                                    <th className="px-8 py-5">{t('stocks.table.name')}</th>
                                    <th className="px-8 py-5">{t('stocks.table.market')}</th>
                                    <th className="px-8 py-5">{t('stocks.table.holdings')}</th>
                                    <th className="px-8 py-5">{t('stocks.table.performance') || '近期趋势'}</th>
                                    <th className="px-8 py-5 text-right">{t('stocks.table.action')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                                <span className="text-gray-500 font-medium">{t('stocks.loading')}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : stocks.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3 text-gray-500">
                                                <TrendingUp size={48} className="opacity-10 mb-2" />
                                                <p className="font-semibold text-lg">{t('stocks.empty')}</p>
                                                <button onClick={openAddModal} className="text-blue-400 font-bold hover:underline">{t('stocks.add_first') || 'Add your first stock'}</button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    stocks.map((stock) => (
                                        <tr key={stock.id} className="group hover:bg-white/[0.02] transition-all duration-300">
                                            <td className="px-8 py-6">
                                                <span className="font-mono font-bold text-white bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 group-hover:border-blue-500/30 transition-colors">
                                                    {stock.symbol}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 font-semibold text-gray-300 group-hover:text-white transition-colors">{stock.name}</td>
                                            <td className="px-8 py-6">
                                                <span className="px-2 py-1 bg-gray-800/50 text-[10px] font-bold text-gray-500 rounded-md border border-white/5 uppercase tracking-wider">
                                                    {stock.market}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 font-mono text-gray-400">
                                                {stock.holdings?.toLocaleString() ?? 0}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-24">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={stock.sparkline?.map((val, idx) => ({ val, idx })) || []}>
                                                                <YAxis hide domain={['auto', 'auto']} />
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="val"
                                                                    stroke={stock.total_pnl >= 0 ? '#f87171' : '#4ade80'}
                                                                    strokeWidth={2}
                                                                    dot={false}
                                                                    isAnimationActive={false}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={`text-[11px] font-bold font-mono ${stock.total_pnl >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                            {stock.total_pnl >= 0 ? '' : '-'}{Math.abs(stock.total_pnl).toFixed(2)}
                                                        </span>
                                                        <span className={`text-[9px] font-medium opacity-60 ${stock.pnl_percent >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                            {stock.pnl_percent >= 0 ? '+' : ''}{stock.pnl_percent}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => openEditModal(stock)}
                                                        className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                                                        title={t('stocks.edit')}
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(stock.id, stock.symbol)}
                                                        className="p-2 text-red-500/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                                        title={t('stocks.delete')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                    <Link
                                                        to={`/stocks/${stock.id}`}
                                                        className="ml-4 flex items-center gap-1.5 px-4 py-2 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 text-xs font-bold rounded-xl border border-blue-500/10 hover:border-blue-500/30 transition-all"
                                                    >
                                                        {t('stocks.table.details')}
                                                        <ArrowRight size={14} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <AddStockModal
                    onClose={() => setShowModal(false)}
                    onSuccess={fetchStocks}
                    stockToEdit={editingStock}
                />
            )}

            <ConfirmModal
                isOpen={confirmDelete.show}
                onClose={() => setConfirmDelete({ ...confirmDelete, show: false })}
                onConfirm={proceedDelete}
                title={t('stocks.delete_title') || "确认删除"}
                message={t('stocks.confirm_delete', { symbol: confirmDelete.symbol })}
                confirmText={t('stocks.delete_btn') || "确认删除"}
                type="danger"
            />
        </>
    );
}
