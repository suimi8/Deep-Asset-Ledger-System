import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { PlusCircle, Search, Calendar, Tag, Layers, CreditCard, Sparkles, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

export default function TransactionForm({ stockId, onSuccess, analysis }) {
    const { t } = useTranslation();

    const getInitialDate = () => {
        const today = new Date();
        const day = today.getDay();
        if (day === 0) today.setDate(today.getDate() - 2); // Sun -> Fri
        else if (day === 6) today.setDate(today.getDate() - 1); // Sat -> Fri
        return today.toISOString().split('T')[0];
    };

    const [form, setForm] = useState({
        type: 'BUY',
        date: getInitialDate(),
        price: '',
        closing_price: '',
        quantity: '',
        fees: '',
        notes: ''
    });

    const [loading, setLoading] = useState(false);
    const [fetchingPrice, setFetchingPrice] = useState(false);

    const handleTypeChange = (e) => {
        const val = e.target.value;
        if (val === 'CLOSE_POSITION') {
            if (!analysis) return;
            setForm({
                ...form,
                type: 'CLOSE_POSITION',
                quantity: analysis.holdings_qty,
                price: analysis.avg_cost?.toFixed(2) || '',
                closing_price: ''
            });
            handleFetchPrice(form.date, 'CLOSE_POSITION');
        } else {
            setForm({ ...form, type: val });
        }
    };

    // Auto-fetch price when date changes while in CLOSE_POSITION mode
    const handleDateChange = (newDate) => {
        const selectedDate = new Date(newDate);
        const day = selectedDate.getDay();

        // 0 is Sunday, 6 is Saturday
        if (day === 0 || day === 6) {
            toast.error(t('stock_detail.weekend_error') || "休市期间（周六日）不可录入交易记录。");
            return;
        }

        setForm({ ...form, date: newDate });
        if (form.type === 'CLOSE_POSITION') {
            handleFetchPrice(newDate, 'CLOSE_POSITION');
        } else {
            handleFetchPrice(newDate, form.type);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const price = parseFloat(form.price);
        const quantity = parseFloat(form.quantity);
        const fees = parseFloat(form.fees || 0);

        if (isNaN(price) || isNaN(quantity)) {
            toast.error(t('stock_detail.error_invalid_input') || "请输入有效的价格和数量");
            return;
        }

        setLoading(true);
        try {
            await axios.post(`/api/stocks/${stockId}/transactions`, {
                ...form,
                type: form.type,
                notes: form.type === 'CLOSE_POSITION' ? 'CLOSE_POSITION' : form.notes,
                price: form.type === 'CLOSE_POSITION' ? parseFloat(form.closing_price) : price,
                quantity: quantity,
                fees: fees,
                stock_id: stockId
            });

            toast.success(t('stock_detail.toast_tx_recorded') || "交易已记录！");
            if (onSuccess) onSuccess();
            setForm({ ...form, price: '', closing_price: '', quantity: '', fees: '', notes: '' });
        } catch (err) {
            console.error(err);
            toast.error(t('stock_detail.transaction_failed') || "录入交易失败");
        } finally {
            setLoading(false);
        }
    };

    const handleFetchPrice = async (targetDate, targetType) => {
        const d = targetDate || form.date;
        const currentType = targetType || form.type;

        if (!d) return;
        setFetchingPrice(true);
        try {
            const res = await axios.get(`/api/quotes/fetch-price?stock_id=${stockId}&date=${d}`);
            if (currentType === 'CLOSE_POSITION') {
                setForm(prev => ({ ...prev, closing_price: res.data.price }));
            } else {
                setForm(prev => ({ ...prev, price: res.data.price }));
            }
        } catch (err) {
            console.error(err);
            toast.error(t('stock_detail.error_fetch_price') || "无法获取该日期的行情，请检查网络或手动输入。");
        } finally {
            setFetchingPrice(false);
        }
    };

    const settlementProfit = form.type === 'CLOSE_POSITION' && form.closing_price && analysis?.accounting_avg_cost
        ? (parseFloat(form.closing_price) - analysis.accounting_avg_cost) * parseFloat(form.quantity)
        : null;

    const totalProfit = form.type === 'CLOSE_POSITION' && form.closing_price && analysis?.avg_cost
        ? (parseFloat(form.closing_price) - analysis.avg_cost) * parseFloat(form.quantity)
        : null;

    return (
        <div className="glass-card p-6 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center gap-2 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <PlusCircle className="text-blue-400" size={20} />
                </div>
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                    {t('stock_detail.add_transaction')}
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                            <Layers size={12} /> {t('stock_detail.type')}
                        </label>
                        <select
                            value={form.type}
                            onChange={handleTypeChange}
                            className="w-full form-input-styled rounded-xl p-3 text-white appearance-none cursor-pointer"
                        >
                            <option value="BUY">{t('stock_detail.buy')}</option>
                            <option value="SELL">{t('stock_detail.sell')}</option>
                            <option value="DIVIDEND_CASH">{t('stock_detail.dividend')}</option>
                            <option value="CLOSE_POSITION">{t('stock_detail.close_position')}</option>
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                            <Calendar size={12} /> {t('stock_detail.date')}
                        </label>
                        <input
                            type="date"
                            value={form.date}
                            onChange={e => handleDateChange(e.target.value)}
                            className="w-full form-input-styled rounded-xl p-3 text-white"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                        <label className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                            <span className="flex items-center gap-1.5">
                                <Tag size={12} />
                                {form.type === 'CLOSE_POSITION' ? t('stock_detail.avg_cost') : t('stock_detail.price')}
                            </span>
                            {form.type === 'CLOSE_POSITION' && analysis?.avg_cost && (
                                <span className="text-[10px] text-gray-500 lowercase pr-1">
                                    {t('stock_detail.avg_cost')}: {analysis.avg_cost.toFixed(2)}
                                </span>
                            )}
                        </label>
                        <div className="relative group">
                            <input
                                type="number" step="0.01" required
                                value={form.price}
                                onChange={e => setForm({ ...form, price: e.target.value })}
                                disabled={form.type === 'CLOSE_POSITION'}
                                className="w-full form-input-styled rounded-xl p-3 text-white pl-4 font-mono text-lg disabled:opacity-50"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {form.type === 'CLOSE_POSITION' && (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-left-4">
                            <label className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                                <span className="flex items-center gap-1.5">
                                    <Sparkles size={12} className="text-blue-400" />
                                    {t('stock_detail.close_price')}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleFetchPrice(form.date, 'CLOSE_POSITION')}
                                    disabled={fetchingPrice || !form.date}
                                    className="flex items-center gap-1 text-[10px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full transition-all disabled:opacity-30"
                                >
                                    <RefreshCw size={10} className={fetchingPrice ? 'animate-spin' : ''} />
                                    {fetchingPrice ? '...' : t('stock_detail.auto_fill')}
                                </button>
                            </label>
                            <input
                                type="number" step="0.01" required
                                value={form.closing_price}
                                onChange={e => setForm({ ...form, closing_price: e.target.value })}
                                className="w-full form-input-styled rounded-xl p-3 text-white pl-4 font-mono text-lg border-blue-500/20 bg-blue-500/5 focus:border-blue-500/50"
                                placeholder="0.00"
                            />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                            <CreditCard size={12} /> {t('stock_detail.quantity')}
                        </label>
                        <input
                            type="number" step="0.0001" required
                            value={form.quantity}
                            onChange={e => setForm({ ...form, quantity: e.target.value })}
                            className="w-full form-input-styled rounded-xl p-3 text-white font-mono"
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">
                            <Tag size={12} /> {t('stock_detail.fees')}
                        </label>
                        <input
                            type="number" step="0.01"
                            value={form.fees}
                            onChange={e => setForm({ ...form, fees: e.target.value })}
                            className="w-full form-input-styled rounded-xl p-3 text-white font-mono"
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {settlementProfit !== null && (
                    <div className={`p-4 rounded-2xl border transition-all duration-500 bg-white/5 border-white/10 animate-in fade-in slide-in-from-top-4`}>
                        <div className="grid grid-cols-2 gap-4 divide-x divide-white/10">
                            <div>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('stock_detail.settlement_pnl')}</p>
                                <p className={`text-lg font-mono font-bold tracking-tighter ${settlementProfit >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {settlementProfit >= 0 ? '+' : ''}{settlementProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="pl-4">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t('stock_detail.total_settlement_pnl') || "累计总盈亏参考"}</p>
                                <p className={`text-lg font-mono font-bold tracking-tighter ${totalProfit >= 0 ? 'text-red-400' : 'text-green-400'}`}>
                                    {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-2"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <PlusCircle size={18} />
                            {t('stock_detail.record_transaction')}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
