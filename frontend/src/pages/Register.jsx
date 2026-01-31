import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Mail, Lock, UserPlus, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { encryptPassword } from '../utils/crypto';

import SliderCaptcha from '../components/SliderCaptcha';

export default function Register() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [showCaptcha, setShowCaptcha] = useState(false); // New state for captcha
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        code: ''
    });

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const [serverToken, setServerToken] = useState(null);
    const [encryptionKey, setEncryptionKey] = useState(null);

    // ...

    const handleGetCodeClick = async () => {
        if (!formData.email) {
            toast.error(t('auth.email_required') || '请输入邮箱');
            return;
        }

        // Fetch dynamic token first
        try {
            setSendingCode(true); // temporary spinner
            const res = await axios.get('/api/users/get-token');
            setServerToken(res.data.token);
            setEncryptionKey(res.data.key);
            setSendingCode(false);
            setShowCaptcha(true);
        } catch (err) {
            setSendingCode(false);
            console.error("Token fetch failed", err);
            toast.error(t('auth.security_check_failed') || '安全验证失败，请刷新页面');
        }
    };

    const handleCaptchaVerify = (w_param) => {
        setShowCaptcha(false);
        handleSendCode(w_param);
    };

    const handleSendCode = async (w_param) => {
        setSendingCode(true);
        try {
            const url = '/api/users/send-code';
            console.log("📤 Sending request to:", url);
            await axios.post(url, {
                email: formData.email,
                lang: i18n.language,
                security_token: serverToken, // Use the fetched token
                w: w_param
            });
            toast.success(t('auth.code_sent'));
            setCountdown(60);
        } catch (err) {
            console.error("❌ Send code error:", err);
            const errorMsg = err.response?.data?.detail || err.message;
            toast.error(t('auth.send_code_failed'));
        } finally {
            setSendingCode(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const encryptedPassword = await encryptPassword(formData.password);
            await axios.post('/api/users/register', {
                ...formData,
                password: encryptedPassword
            });
            toast.success(t('auth.register_success'));
            navigate('/login');
        } catch (err) {
            toast.error(t('auth.register_failed'));
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
                        <UserPlus className="text-blue-400" size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                        {t('auth.register_title') || '创建新账户'}
                    </h1>
                    <p className="text-gray-400">{t('auth.register_subtitle') || '注册即刻开启您的数据化投资之旅'}</p>
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
                                    onClick={handleGetCodeClick}
                                    disabled={sendingCode || countdown > 0}
                                    className="px-6 rounded-2xl bg-white/5 border border-white/10 text-xs font-bold text-blue-400 hover:bg-white/10 disabled:opacity-50 transition-all min-w-[120px]"
                                >
                                    {sendingCode ? <Loader2 className="animate-spin mx-auto" size={16} /> : (
                                        countdown > 0 ? `${countdown}s` : (t('auth.send_code') || '获取验证码')
                                    )}
                                </button>
                            </div>
                        </div>

                        {showCaptcha && (
                            <SliderCaptcha
                                onVerify={handleCaptchaVerify}
                                onClose={() => setShowCaptcha(false)}
                                encryptionKey={encryptionKey}
                            />
                        )}

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                                {t('auth.password') || '设置密码'}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    className="w-full bg-white/5 border border-white/5 focus:border-blue-500/30 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-all"
                                    placeholder={t('auth.password_placeholder')}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                                    <span>{t('auth.register_btn') || '注 册'}</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-sm">
                            {t('auth.have_account') || '已有账号？'}
                            <Link to="/login" className="ml-2 text-blue-400 font-bold hover:underline">
                                {t('auth.login_link') || '立即登录'}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
