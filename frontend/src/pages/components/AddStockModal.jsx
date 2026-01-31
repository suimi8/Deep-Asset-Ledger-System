import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { X, Search, Sparkles, Check, Globe, Tag, Fingerprint, Plus } from 'lucide-react';

export default function AddStockModal({ onClose, onSuccess, stockToEdit = null }) {
    const { t } = useTranslation();
    const [form, setForm] = useState(stockToEdit ? {
        symbol: stockToEdit.symbol,
        name: stockToEdit.name,
        market: stockToEdit.market
    } : { symbol: '', name: '', market: 'CN' });

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = async () => {
        if (!query) return;
        setSearching(true);
        try {
            const res = await axios.get(`/api/stocks/search/query?q=${query}`);
            setResults(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
            setHasSearched(true);
        }
    };

    const selectStock = (stock) => {
        setForm({
            symbol: stock.symbol,
            name: stock.name,
            market: stock.market
        });
        setResults([]);
        setQuery('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (stockToEdit) {
                await axios.put(`/api/stocks/${stockToEdit.id}`, form);
            } else {
                await axios.post('/api/stocks', form);
            }
            toast.success(stockToEdit ? t('stocks.update_success') || "已更新" : t('stocks.add_success') || "已添加");
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(t('stocks.error_add') + ": " + (err.response?.data?.detail || err.message));
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in overflow-y-auto">
            <div className="glass-pane bg-slate-900/90 p-8 rounded-[32px] border border-white/10 w-full max-w-lg shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            {stockToEdit ? t('stocks.edit_title') : t('stocks.add_button')}
                        </h3>
                        <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mt-1">
                            {stockToEdit ? t('stocks.identity_config') : t('stocks.discovery_reg')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-all text-gray-400 hover:text-white border border-white/5">
                        <X size={20} />
                    </button>
                </div>

                {/* Intelligent Search Section */}
                {!stockToEdit && (
                    <div className="mb-8 space-y-4">
                        <div className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                className="w-full form-input-styled rounded-2xl py-4 pl-12 pr-28 text-sm font-semibold text-white tracking-wide"
                                placeholder={t('stocks.search_placeholder') || "Search by Symbol or Name..."}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={searching}
                                className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {searching ? (
                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Sparkles size={14} />
                                )}
                                {t('stocks.search_btn') || 'Search'}
                            </button>
                        </div>

                        {/* Search Results Display */}
                        {hasSearched && !searching && results.length > 0 && (
                            <div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden max-h-52 overflow-y-auto custom-scrollbar">
                                {results.map((item, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => selectStock(item)}
                                        className="flex items-center justify-between p-4 hover:bg-blue-500/5 cursor-pointer transition-colors border-b border-white/5 last:border-0 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-mono font-black text-blue-400 text-xs border border-white/5 group-hover:border-blue-500/30">
                                                {item.symbol.substring(0, 4)}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-bold tracking-tight">{item.name}</p>
                                                <p className="text-gray-500 text-[10px] font-mono">{item.symbol}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded border border-white/5 uppercase">{item.market}</span>
                                            <div className="p-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400">
                                                <Check size={16} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!searching && hasSearched && results.length === 0 && (
                            <div className="text-center py-4 text-gray-500 text-xs font-medium italic">
                                {t('stocks.no_results')}
                            </div>
                        )}
                    </div>
                )}

                {/* Configuration Form */}
                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">
                                <Fingerprint size={12} /> {t('stocks.table.symbol')}
                            </label>
                            <input
                                type="text" required
                                value={form.symbol}
                                onChange={e => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                                className="w-full form-input-styled rounded-2xl p-4 text-white font-mono font-bold tracking-widest"
                                placeholder="000000"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">
                                <Globe size={12} /> {t('stocks.table.market')}
                            </label>
                            <select
                                value={form.market}
                                onChange={e => setForm({ ...form, market: e.target.value })}
                                className="w-full form-input-styled rounded-2xl p-4 text-white font-bold appearance-none cursor-pointer"
                            >
                                <option value="US">{t('stocks.market_types.US')}</option>
                                <option value="HK">{t('stocks.market_types.HK')}</option>
                                <option value="CN">{t('stocks.market_types.CN')}</option>
                                <option value="Crypto">{t('stocks.market_types.Crypto')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em] ml-1">
                            <Tag size={12} /> {t('stocks.table.name')}
                        </label>
                        <input
                            type="text" required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full form-input-styled rounded-2xl p-4 text-white font-bold"
                            placeholder={t('stocks.name_label')}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-primary w-full py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/40 text-white flex items-center justify-center gap-3 active:scale-95 transform transition-all"
                    >
                        {stockToEdit ? <Sparkles size={18} /> : <Plus size={18} />}
                        {stockToEdit ? t('stocks.save_changes') : t('stocks.add_button')}
                    </button>
                </form>
            </div>
        </div>
    );
}
