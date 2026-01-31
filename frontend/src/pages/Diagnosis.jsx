import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Search, Activity, Box, PieChart, MapPin, Info, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Diagnosis() {
    const { t } = useTranslation();
    const [symbol, setSymbol] = useState('');
    const [apiKey, setApiKey] = useState(localStorage.getItem('external_api_key') || '');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleDiagnose = async () => {
        if (!symbol) return;
        setLoading(true);
        setResult(null);

        // Save key to local storage for convenience
        if (apiKey) localStorage.setItem('external_api_key', apiKey);

        try {
            const response = await axios.get(`/api/external/diagnosis/${symbol}`, {
                headers: {
                    'X-API-KEY': apiKey
                }
            });
            setResult(response.data);
            toast.success(t('diagnosis.result_title'));
        } catch (err) {
            const status = err.response?.status;
            const detail = err.response?.data?.detail;

            if (status === 401) {
                toast.error(t('diagnosis.error_unauthorized'));
            } else if (status === 404) {
                toast.error(t('diagnosis.error_not_found'));
            } else if (status === 500 && detail?.includes('not configured')) {
                toast.error(t('diagnosis.error_config'));
            } else {
                toast.error(detail || 'Diagnosis failed');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-xl">
                        <Activity className="text-blue-400" size={28} />
                    </div>
                    {t('diagnosis.title')}
                </h2>
                <p className="text-gray-400 font-medium px-1">{t('diagnosis.subtitle')}</p>
            </div>

            {/* Input Card */}
            <div className="glass-pane p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                            {t('diagnosis.input_symbol')}
                        </label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                                placeholder={t('diagnosis.placeholder_symbol')}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-white/10"
                                onKeyDown={(e) => e.key === 'Enter' && handleDiagnose()}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest px-1">
                            {t('diagnosis.input_key')}
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter X-API-KEY..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-white/10"
                        />
                    </div>
                </div>

                <button
                    onClick={handleDiagnose}
                    disabled={loading || !symbol}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            <Sparkles size={18} />
                            {t('diagnosis.btn_diagnose')}
                        </>
                    )}
                </button>
            </div>

            {/* Results */}
            {result && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
                    <div className="flex items-center gap-4 px-2">
                        <h3 className="text-xl font-bold text-white tracking-tight">{t('diagnosis.result_title')}</h3>
                        <div className="h-px flex-1 bg-white/5" />
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                            {result.market}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Summary Card */}
                        <div className="md:col-span-2 glass-pane p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full group-hover:bg-blue-500/10 transition-colors" />
                            <div className="relative space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">{result.name}</div>
                                        <div className="text-gray-500 font-mono font-bold tracking-widest">{result.symbol}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-1">{t('stock_detail.current_price')}</div>
                                        <div className="text-4xl font-black text-blue-400 tabular-nums">
                                            {result.price?.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-8 border-t border-white/5">
                                    <DetailItem icon={<Box size={14} />} label={t('diagnosis.info.market_cap')} value={result.details.total_market_cap || '-'} />
                                    <DetailItem icon={<PieChart size={14} />} label={t('diagnosis.info.pe_ratio')} value={result.details.pe_ratio || '-'} />
                                    <DetailItem icon={<Activity size={14} />} label={t('diagnosis.info.industry')} value={result.details.industry || '-'} />
                                    {result.details.area && <DetailItem icon={<MapPin size={14} />} label={t('diagnosis.info.area')} value={result.details.area} />}
                                    {result.details.dividend_yield && <DetailItem icon={<Info size={14} />} label={t('diagnosis.info.dividend')} value={(result.details.dividend_yield * 100).toFixed(2) + '%'} />}
                                </div>
                            </div>
                        </div>

                        {/* Summary / Notes */}
                        <div className="glass-pane p-8 rounded-[2rem] border border-white/5 bg-white/[0.02]">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Info size={14} className="text-blue-500" />
                                {t('diagnosis.info.summary')}
                            </h4>
                            <p className="text-sm text-gray-300 leading-relaxed font-medium">
                                {result.details.summary || `No detailed summary available for ${result.name}. This is a ${result.market} listed entity in the ${result.details.industry || 'unknown'} industry.`}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {!result && !loading && (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 opacity-30">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center">
                        <Activity size={32} className="text-gray-500" />
                    </div>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-xs">Ready for Analysis</p>
                </div>
            )}
        </div>
    );
}

function DetailItem({ icon, label, value }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-gray-500">
                {icon}
                <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-lg font-bold text-white tracking-tight">{value}</div>
        </div>
    );
}
