import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Mail, Lock, LogIn, ArrowRight, Loader2 } from 'lucide-react';
import { encryptPassword } from '../utils/crypto';

export default function Login() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { login, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });

    useEffect(() => {
        if (user) {
            navigate('/');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const encryptedPassword = await encryptPassword(formData.password);
            const res = await axios.post('/api/users/login', {
                email: formData.email,
                password: encryptedPassword
            });
            login(res.data.access_token);
            toast.success(t('auth.login_success'));
            navigate('/');
        } catch (err) {
            toast.error(t('auth.login_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f172a] relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full -z-10 animate-pulse" />

            <div className="w-full max-w-md animate-fade-in">
                <div className="text-center mb-10">
                    <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-6">
                        <LogIn className="text-blue-400" size={32} />
                    </div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                        {t('auth.login_title') || '欢迎回来'}
                    </h1>
                    <p className="text-gray-400">{t('auth.login_subtitle') || '使用您的邮箱账号继续管理您的资产'}</p>
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
                                {t('auth.password') || '账户密码'}
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
                            <div className="flex justify-end mt-2 px-1">
                                <Link to="/forgot-password" size="sm" className="text-gray-500 hover:text-blue-400 text-xs font-medium transition-colors">
                                    {t('auth.forgot_password') || '忘记密码？'}
                                </Link>
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    <span>{t('auth.login_btn') || '登 录'}</span>
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-white/5 text-center">
                        <p className="text-gray-500 text-sm">
                            {t('auth.no_account') || '还没有账号？'}
                            <Link to="/register" className="ml-2 text-blue-400 font-bold hover:underline">
                                {t('auth.register_link') || '立即注册'}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
