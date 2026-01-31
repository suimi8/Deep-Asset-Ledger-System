import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { ShieldCheck, Save, Key, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
    const { t, i18n } = useTranslation();
    const [currency, setCurrency] = useState(localStorage.getItem('currency') || 'USD');
    const [language, setLanguage] = useState(i18n.language);
    const [masterApiKey, setMasterApiKey] = useState('');
    const [isConfigured, setIsConfigured] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfigStatus();
    }, []);

    const fetchConfigStatus = async () => {
        try {
            const res = await axios.get('/api/external/config/api-key');
            setIsConfigured(res.data.isConfigured);
        } catch (err) {
            console.error('Failed to fetch config status');
        }
    };

    const handleSaveApiKey = async () => {
        if (!masterApiKey) return;
        setSaving(true);
        try {
            await axios.post('/api/external/config/api-key', { apiKey: masterApiKey });
            toast.success('System API Key updated!');
            setIsConfigured(true);
            setMasterApiKey('');
        } catch (err) {
            toast.error('Failed to update Key');
        } finally {
            setSaving(false);
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
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">{t('settings.title')}</h2>

            <div className="bg-gray-800/40 backdrop-blur-xl rounded-[2rem] border border-white/5 p-8 space-y-8 shadow-2xl">
                {/* Currency Setting */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 px-1">{t('settings.currency')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {currencies.map(curr => (
                            <button
                                key={curr.code}
                                onClick={() => handleCurrencyChange(curr.code)}
                                className={`group relative p-6 rounded-2xl border transition-all duration-300 ${currency === curr.code
                                    ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                    : 'border-white/5 bg-white/5 text-gray-400 hover:bg-white/10 hover:border-white/10'
                                    }`}
                            >
                                <div className={`text-3xl font-bold mb-2 transition-transform duration-300 group-hover:scale-110 ${currency === curr.code ? 'text-blue-400' : ''}`}>
                                    {curr.symbol}
                                </div>
                                <div className="text-sm font-bold mb-1">{curr.name}</div>
                                <div className="text-[10px] font-bold opacity-40 tracking-widest">{curr.code}</div>
                                {currency === curr.code && (
                                    <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* API Key Setting */}
                <div className="pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between mb-6 px-1">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('diagnosis.input_key')} (Master)</h3>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${isConfigured ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {isConfigured ? <CheckCircle size={10} /> : <XCircle size={10} />}
                            {isConfigured ? 'Active' : 'Missing'}
                        </div>
                    </div>

                    <div className="relative group">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="password"
                            value={masterApiKey}
                            onChange={(e) => setMasterApiKey(e.target.value)}
                            placeholder="Set Master EXTERNAL_API_KEY..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-32 text-white font-mono text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:bg-white/10"
                        />
                        <button
                            onClick={handleSaveApiKey}
                            disabled={saving || !masterApiKey}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {saving ? '...' : 'Save'}
                        </button>
                    </div>
                    <p className="mt-4 text-[11px] font-medium text-gray-500 px-1 leading-relaxed italic">
                        * This sets the secret key required for external Curl access and the Diagnosis tool.
                        It is stored securely in the database.
                    </p>
                </div>

                {/* Preview */}
                <div className="pt-8 border-t border-white/5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6 px-1">{t('settings.preview')}</h3>
                    <div className="bg-gradient-to-br from-white/5 to-transparent p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
                        <div className="relative">
                            <div className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">{t('stock_detail.current_price')}</div>
                            <div className="text-4xl font-black text-white tracking-tight flex items-baseline gap-1">
                                <span className="text-2xl text-blue-400">{currencies.find(c => c.code === currency)?.symbol}</span>
                                123.45
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
