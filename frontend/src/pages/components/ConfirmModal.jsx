import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type = 'danger' }) {
    if (!isOpen) return null;

    const { t } = useTranslation();

    const colors = {
        danger: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
        warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20',
        info: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
            <div className="glass-pane bg-slate-900/90 p-8 rounded-[32px] border border-white/10 w-full max-w-md shadow-2xl relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${type === 'danger' ? 'bg-red-500' : 'bg-amber-500'} opacity-50`} />

                <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl ${type === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-gray-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-8">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-2xl font-bold text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all border border-white/5"
                    >
                        {cancelText || t('common.cancel') || '取消'}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all shadow-lg ${colors[type]}`}
                    >
                        {confirmText || t('common.confirm') || '确定'}
                    </button>
                </div>
            </div>
        </div>
    );
}
