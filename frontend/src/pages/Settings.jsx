import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ShieldCheck, Save, Key, Globe, CheckCircle, XCircle, Loader2, Activity, Search, Sparkles, Box, PieChart, MapPin, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'USD');
    const [language, setLanguage] = useState(i18n.language);

    // API Settings
    const [masterApiKey, setMasterApiKey] = useState('');
    const [masterApiUrl, setMasterApiUrl] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [saving, setSaving] = useState(false);

    // Diagnosis Test State
    const [testSymbol, setTestSymbol] = useState('');
    const [diagnosing, setDiagnosing] = useState(false);
    const [testResult, setTestResult] = useState(null);

    useEffect(() => {
        fetchConfigStatus();
    }, []);

    const fetchConfigStatus = async () => {
        try {
            const res = await axios.get('/api/external/config/api-settings');
            setIsConfigured(res.data.isConfigured);
            setMasterApiUrl(res.data.apiUrl || '');
        } catch (err) {
            console.error('Failed to fetch config status');
        }
    };

    const handleSaveApiSettings = async () => {
        setSaving(true);
        try {
            await axios.post('/api/external/config/api-settings', {
                apiKey: masterApiKey || undefined,
                apiUrl: masterApiUrl
            });
            toast.success(t('settings.update_success') || 'Settings updated!');
            setIsConfigured(!!masterApiKey || isConfigured);
            if (masterApiKey) setMasterApiKey('');
            fetchConfigStatus();
        } catch (err) {
            toast.error(t('settings.update_failed') || 'Failed to update Settings');
        } finally {
            setSaving(false);
        }
    };

    const handleRunTest = async () => {
        if (!testSymbol) return;
        setDiagnosing(true);
        setTestResult(null);
        try {
            // Note: In production/Zeabur, the API key for testing comes from the DB, 
            // but the diagnosis route requires it in header. 
            // For the internal test tool, we might need a way to pass the key or let the backend use its stored one.
            // However, the current /api/external/diagnosis/{symbol} requires X-API-KEY.
            // Let's assume the user knows the key they just set.
            const response = await axios.get(`/api/external/diagnosis/${testSymbol}`, {
                headers: { 'X-API-KEY': localStorage.getItem('last_saved_key') || masterApiKey }
            });
            setTestResult(response.data);
            toast.success(t('diagnosis.result_title'));
        } catch (err) {
            const detail = err.response?.data?.detail || 'Test failed';
            toast.error(detail);
        } finally {
            setDiagnosing(false);
        }
    };

    const currencies = [
        { code: 'USD', symbol: '$', name: t('settings.currencies.USD') },
        { code: 'CNY', symbol: '¥', name: t('settings.currencies.CNY') },
        { code: 'HKD', symbol: 'HK$', name: t('settings.currencies.HKD') }
    ];

    const handleCurrencyChange = (newCurrency) => {
        setCurrency(newCurrency);
        localStorage.setItem('currency', newCurrency);
        window.dispatchEvent(new CustomEvent('currencyChange', { detail: newCurrency }));
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <h2 className="text-3xl font-bold text-white mb-8">{t('settings.title')}</h2>

            <div className="bg-gray-800/40 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 md:p-12 space-y-12 shadow-2xl">
                {/* Currency Setting */}
                <section>
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-8 px-1">{t('settings.currency')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {currencies.map(curr => (
                            <button
                                key={curr.code}
                                onClick={() => handleCurrencyChange(curr.code)}
                                className={`group relative p-8 rounded-3xl border transition-all duration-500 ${currency === curr.code
                                    ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_40px_rgba(59,130,246,0.1)]'
                                    : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                                    }`}
                            >
                                <div className={`text-4xl font-black mb-3 transition-transform duration-500 group-hover:scale-110 ${currency === curr.code ? 'text-blue-400' : ''}`}>
                                    {curr.symbol}
                                </div>
                                <div className="text-base font-bold mb-1">{curr.name}</div>
                                <div className="text-[10px] font-black opacity-30 tracking-[0.2em]">{curr.code}</div>
                                {currency === curr.code && (
                                    <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_12px_#3b82f6]" />
                                )}
                            </button>
                        ))}
                    </div>
                </section>

                {/* API Settings Section */}
                <section className="pt-12 border-t border-white/5">
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <Globe size={18} className="text-blue-400" />
                            </div>
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em]">{t('settings.api_config')}</h3>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isConfigured ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {isConfigured ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {isConfigured ? 'Active' : 'Key Missing'}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Form */}
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <div className="relative group">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={masterApiUrl}
                                        onChange={(e) => setMasterApiUrl(e.target.value)}
                                        placeholder={t('diagnosis.input_url')}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-white/10"
                                    />
                                </div>

                                <div className="relative group">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={masterApiKey}
                                        onChange={(e) => {
                                            setMasterApiKey(e.target.value);
                                            localStorage.setItem('last_saved_key', e.target.value);
                                        }}
                                        placeholder={t('settings.set_master_key')}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-white/10"
                                    />
                                </div>

                                <button
                                    onClick={handleSaveApiSettings}
                                    disabled={saving}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-[0.98]"
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {t('common.confirm') || 'Save Changes'}
                                </button>
                            </div>
                            <p className="text-[11px] font-medium text-gray-500 px-1 leading-relaxed italic">
                                * {t('diagnosis.subtitle')}
                            </p>
                        </div>

                        {/* Test Tool Panel */}
                        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 space-y-6">
                            <h4 className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">
                                <Activity size={12} className="text-blue-400" />
                                {t('settings.connection_test')}
                            </h4>

                            <div className="flex gap-3">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                                    <input
                                        type="text"
                                        value={testSymbol}
                                        onChange={(e) => setTestSymbol(e.target.value.toUpperCase())}
                                        placeholder={t('diagnosis.placeholder_symbol')}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleRunTest}
                                    disabled={diagnosing || !testSymbol}
                                    className="bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white px-6 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                                >
                                    {diagnosing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {t('diagnosis.btn_diagnose')}
                                </button>
                            </div>

                            {/* Test Result Mini View */}
                            {testResult && (
                                <div className="mt-6 p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-lg font-black text-white">{testResult.name}</div>
                                            <div className="text-[10px] font-mono text-gray-500">{testResult.symbol}</div>
                                        </div>
                                        <div className="text-xl font-black text-blue-400 tracking-tight">
                                            {testResult.price}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-[11px]">
                                        <div>
                                            <span className="text-gray-500 uppercase font-black block mb-1">{t('diagnosis.info.market_cap')}</span>
                                            <span className="text-white font-bold">{testResult.details.total_market_cap || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500 uppercase font-black block mb-1">{t('diagnosis.info.industry')}</span>
                                            <span className="text-white font-bold truncate block">{testResult.details.industry || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!testResult && !diagnosing && (
                                <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-2xl opacity-20">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t('settings.wait_for_test')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Preview */}
                <section className="pt-12 border-t border-white/5">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] mb-8 px-1">{t('settings.preview')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-white/5 to-transparent p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                            <div className="relative">
                                <div className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">{t('stock_detail.current_price')}</div>
                                <div className="text-5xl font-black text-white tracking-tighter flex items-baseline gap-2">
                                    <span className="text-2xl text-blue-500 font-bold">{currencies.find(c => c.code === currency)?.symbol}</span>
                                    123.45
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
