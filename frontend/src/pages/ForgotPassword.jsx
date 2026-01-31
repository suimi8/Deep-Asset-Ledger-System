import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ShieldCheck, ArrowRight, Loader2, KeyRound } from 'lucide-react';
import { encryptPassword } from '../utils/crypto';

export default function ForgotPassword() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [formData, setFormData] = useState({
        email: '',
        code: '',
        new_password: ''
    });

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSendCode = async () => {
        if (!formData.email) {
            toast.error(t('auth.email_required') || '请输入邮箱');
            return;
        }
        setSendingCode(true);
        try {
            await axios.post('/api/users/send-code', {
                email: formData.email,
                lang: i18n.language
            });
            toast.success(t('auth.code_sent'));
            setCountdown(60);
        } catch (err) {
            toast.error(t('auth.send_code_failed'));
        } finally {
            setSendingCode(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const encryptedPassword = await encryptPassword(formData.new_password);
            await axios.post('/api/users/reset-password', {
                ...formData,
                new_password: encryptedPassword
            });
            toast.success(t('auth.reset_password_success'));
            navigate('/login');
        } catch (err) {
            toast.error(t('auth.reset_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f172a] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full -z-10" />

            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-6">
                        <KeyRound className="text-blue-400" size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                        {t('auth.reset_password_title') || '重置密码'}
                    </h1>
                    <p className="text-gray-400">{t('auth.reset_password_subtitle') || '验证您的邮箱以设置新密码'}</p>
                </div>

                <div className="glass-card p-8 rounded-[2rem] border border-white/5 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('auth.email') || '邮箱地址'}
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-all"
                                    placeholder={t('auth.email_placeholder')}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('auth.verification_code') || '验证码'}
                            </label>
                            <div className="flex gap-3">
                                <div className="relative flex-1 group">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-all"
                                        placeholder={t('auth.code_placeholder')}
                                        maxLength={6}
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSendCode}
                                    disabled={sendingCode || countdown > 0}
                                    className="px-6 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-blue-400 hover:bg-white/10 disabled:opacity-50 transition-all min-w-[120px]"
                                >
                                    {sendingCode ? <Loader2 className="animate-spin mx-auto" size={16} /> : (
                                        countdown > 0 ? `${countdown}s` : (t('auth.send_code') || '获取验证码')
                                    )}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('auth.new_password') || '新密码'}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-all"
                                    placeholder={t('auth.password_placeholder')}
                                    value={formData.new_password}
                                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <span>{t('auth.reset_password_btn') || '重置密码'}</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <Link to="/login" className="text-blue-400 font-bold hover:underline text-sm">
                            {t('auth.login_link') || '返回登录'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
