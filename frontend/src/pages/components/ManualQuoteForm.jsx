import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Save } from 'lucide-react';

export default function ManualQuoteForm({ stockId, onSuccess }) {
    const { t } = useTranslation();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/quotes/', {
                stock_id: parseInt(stockId),
                date: date,
                close: parseFloat(price),
                open: 0,
                high: 0,
                low: 0,
                volume: 0,
                is_manual: true
            });
            setPrice('');
            onSuccess();
            toast.success(t('stock_detail.toast_quote_added') || "行情已添加");
        } catch (err) {
            console.error(err);
            toast.error(t('stock_detail.update_failed') || "添加失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 overflow-hidden">
            <h3 className="text-xl font-semibold mb-4 text-gray-300">{t('stock_detail.add_quote')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('stock_detail.date')}</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">{t('stock_detail.close_price')}</label>
                    <input
                        type="number"
                        step="0.01"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 h-[42px]"
                >
                    <Save size={18} />
                    {t('stock_detail.save_quote')}
                </button>
            </form>
        </div>
    );
}
