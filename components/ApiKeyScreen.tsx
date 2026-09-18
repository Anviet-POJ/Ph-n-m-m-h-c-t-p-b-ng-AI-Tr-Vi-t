
import React, { useState } from 'react';
import { LOCALIZATION_STRINGS } from '../constants';
import { Language } from '../types';

interface ApiKeyScreenProps {
    onSaveKey: (key: string) => void;
}

const ApiKeyScreen: React.FC<ApiKeyScreenProps> = ({ onSaveKey }) => {
    // Default to Vietnamese for the API key screen as it's the primary audience, 
    // or provide a simple toggle if needed. 
    // Since language selection happens AFTER this screen, we'll default to VI for now
    // but offer a small language switcher or just display in VI/EN.
    // For simplicity, let's use the browser language or default to VI.
    
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'instructions' | 'guide'>('instructions');
    
    // Simple internal language state for this screen only
    const [localLang, setLocalLang] = useState<Language>(Language.VI);
    
    const t = (key: string) => LOCALIZATION_STRINGS[localLang]?.[key] || LOCALIZATION_STRINGS[Language.EN][key];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedKey = apiKey.trim();
        
        if (!trimmedKey) {
            setError(t('fill_all_fields'));
            return;
        }
        
        if (!trimmedKey.startsWith('AIza')) {
            setError(t('invalid_api_key'));
            return;
        }
        
        onSaveKey(trimmedKey);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 font-sans text-slate-800">
            <div className="absolute top-4 right-4 flex space-x-2">
                <button onClick={() => setLocalLang(Language.VI)} className={`px-2 py-1 rounded ${localLang === Language.VI ? 'bg-indigo-600 text-white' : 'bg-white'}`}>VI</button>
                <button onClick={() => setLocalLang(Language.EN)} className={`px-2 py-1 rounded ${localLang === Language.EN ? 'bg-indigo-600 text-white' : 'bg-white'}`}>EN</button>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-2xl w-full border border-slate-200">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-indigo-700 mb-2">{t('welcome_to_triviet')}</h1>
                    <p className="text-slate-600">{t('slogan')}</p>
                </div>

                <div className="mb-8">
                    <h2 className="text-xl font-bold text-slate-900 mb-2">{t('enter_api_key_title')}</h2>
                    <p className="text-sm text-slate-500 mb-4">{t('enter_api_key_desc')}</p>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input 
                                type="password" 
                                value={apiKey} 
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full p-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-sm"
                                placeholder={t('api_key_placeholder')}
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                        <button 
                            type="submit" 
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg transition-all transform hover:scale-[1.02]"
                        >
                            {t('save_api_key')}
                        </button>
                    </form>
                </div>

                {/* Tabs for Instructions */}
                <div className="border-t border-slate-200 pt-6">
                    <div className="flex space-x-4 mb-4 border-b border-slate-200 pb-2">
                        <button 
                            onClick={() => setActiveTab('instructions')}
                            className={`pb-2 font-semibold transition-colors ${activeTab === 'instructions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('get_api_key_instructions')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('guide')}
                            className={`pb-2 font-semibold transition-colors ${activeTab === 'guide' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t('user_guide')}
                        </button>
                    </div>

                    <div className="h-64 overflow-y-auto custom-scrollbar pr-2">
                        {activeTab === 'instructions' ? (
                            <div className="space-y-3 text-sm text-slate-700">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="font-semibold">{t('step_1')}</p>
                                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline hover:text-indigo-800 break-words block mt-1">
                                        https://aistudio.google.com/app/apikey
                                    </a>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">{t('step_2')}</div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">{t('step_3')}</div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">{t('step_4')}</div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">{t('step_5')}</div>
                            </div>
                        ) : (
                            <div className="space-y-4 text-sm text-slate-700">
                                <div className="flex gap-3">
                                    <div className="bg-indigo-100 p-2 rounded-lg h-fit text-indigo-700 font-bold">1</div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t('feature_1')}</h4>
                                        <p>{t('feature_1_desc')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-purple-100 p-2 rounded-lg h-fit text-purple-700 font-bold">2</div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t('feature_2')}</h4>
                                        <p>{t('feature_2_desc')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-green-100 p-2 rounded-lg h-fit text-green-700 font-bold">3</div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t('feature_3')}</h4>
                                        <p>{t('feature_3_desc')}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-amber-100 p-2 rounded-lg h-fit text-amber-700 font-bold">4</div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{t('feature_4')}</h4>
                                        <p>{t('feature_4_desc')}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApiKeyScreen;
