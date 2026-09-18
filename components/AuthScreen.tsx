
import React, { useState } from 'react';
import { LOCALIZATION_STRINGS } from '../constants';
import { Language } from '../types';

interface AuthScreenProps {
    onLogin: (username: string, pass: string) => Promise<boolean>;
    onRegister: (username: string, pass: string) => Promise<boolean>;
    onAdminLogin: (username: string, pass: string) => boolean;
    language: Language;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin, onRegister, onAdminLogin, language }) => {
    const defaultLang = Language.VI; 
    const t = (key: string) => LOCALIZATION_STRINGS[defaultLang]?.[key] || LOCALIZATION_STRINGS[Language.EN][key];

    const [isLoginMode, setIsLoginMode] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [message, setMessage] = useState('');
    const [showAdminModal, setShowAdminModal] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage('');
        if (!username.trim() || !password.trim()) {
            setMessage(t('fill_all_fields'));
            return;
        }

        if (isLoginMode) {
            const success = await onLogin(username, password);
            if (!success) setMessage(t('invalid_credentials'));
        } else {
            const success = await onRegister(username, password);
            if (success) {
                setMessage(t('register_success'));
                setIsLoginMode(true);
                setPassword('');
            } else {
                setMessage(t('user_exists'));
            }
        }
    };

    const handleAdminSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminUsername.trim() || !adminPassword.trim()) {
             setMessage(t('fill_all_fields'));
             return;
        }
        const success = onAdminLogin(adminUsername, adminPassword);
        if (!success) {
            setMessage(t('admin_login_failed'));
        } else {
            setShowAdminModal(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-50 via-white to-indigo-50 p-4 font-sans text-slate-800">
             {/* Floating decorative shapes */}
             <div className="absolute top-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
             <div className="absolute top-20 right-20 w-72 h-72 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
             <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>

             <div className="bg-white/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl shadow-indigo-100/50 max-w-md w-full border border-white/50 relative z-50">
                <div className="text-center mb-8">
                    <div className="inline-block p-3 rounded-2xl bg-indigo-50 mb-4">
                        <svg className="w-10 h-10 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Trí Việt</h1>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Khai mở tri thức, định hình tương lai</p>
                </div>
                
                <div className="flex p-1 mb-8 bg-slate-100 rounded-xl relative">
                    <div className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${!isLoginMode ? 'translate-x-full' : ''}`}></div>
                    <button 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors duration-300 ${isLoginMode ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => { setIsLoginMode(true); setMessage(''); }}
                    >
                        {t('login')}
                    </button>
                    <button 
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg relative z-10 transition-colors duration-300 ${!isLoginMode ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => { setIsLoginMode(false); setMessage(''); }}
                    >
                        {t('register')}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">{t('username')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all duration-200 text-slate-900 font-medium placeholder-slate-400"
                                placeholder="username"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">{t('password')}</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:bg-white transition-all duration-200 text-slate-900 font-medium placeholder-slate-400"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer focus:outline-none"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>
                    
                    {message && (
                        <div className={`text-sm font-medium text-center p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-200"
                    >
                        {isLoginMode ? t('login') : t('register')}
                    </button>
                </form>

                {/* Footer & Admin Access */}
                <div className="mt-8 text-center">
                     <p className="text-xs text-slate-400 mb-4">
                        © 2024 Trí Việt AI Education Platform
                     </p>
                    <button 
                        onClick={() => { setShowAdminModal(true); setMessage(''); setAdminPassword(''); setAdminUsername(''); }}
                        className="text-xs text-slate-300 hover:text-slate-500 transition-colors font-medium px-2 py-1 rounded hover:bg-slate-50"
                        title={t('enter_admin_mode')}
                    >
                        Admin Access
                    </button>
                </div>
             </div>

             {/* Admin Login Modal */}
             {showAdminModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-100 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-6 bg-red-500 rounded-full inline-block"></span>
                                {t('enter_admin_mode')}
                            </h3>
                            <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAdminSubmit} className="space-y-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">{t('username')}</label>
                                <input 
                                    type="text" 
                                    value={adminUsername} 
                                    onChange={(e) => setAdminUsername(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">{t('password')}</label>
                                <input 
                                    type="password" 
                                    value={adminPassword} 
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                                />
                            </div>
                             {message && <p className="text-xs font-medium text-red-500 bg-red-50 p-2 rounded text-center">{message}</p>}
                            <button type="submit" className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200">
                                {t('login')}
                            </button>
                        </form>
                    </div>
                </div>
             )}
        </div>
    );
};

export default AuthScreen;
