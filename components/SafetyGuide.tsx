
import React from 'react';
import { useApp } from '../App';

const SafetyGuide: React.FC = () => {
    const { t } = useApp();

    const colorStyles: Record<string, { border: string; bg: string; text: string }> = {
        blue: { border: 'border-blue-200', bg: 'bg-blue-100', text: 'text-blue-600' },
        red: { border: 'border-red-200', bg: 'bg-red-100', text: 'text-red-600' },
        green: { border: 'border-green-200', bg: 'bg-green-100', text: 'text-green-600' },
        purple: { border: 'border-purple-200', bg: 'bg-purple-100', text: 'text-purple-600' },
    };

    const GuideCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; color: string }> = ({ title, desc, icon, color }) => {
        const styles = colorStyles[color] || colorStyles.blue;
        
        return (
            <div className={`bg-white/90 backdrop-blur-sm border-2 ${styles.border} shadow-md p-6 rounded-2xl flex flex-col items-center text-center hover:shadow-lg transition-shadow duration-300`}>
                <div className={`w-16 h-16 mb-4 rounded-full ${styles.bg} flex items-center justify-center ${styles.text}`}>
                    {icon}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-600 text-sm">{desc}</p>
            </div>
        );
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-4">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-3">{t('safety_guide_title')}</h2>
                <p className="text-slate-500 max-w-md mx-auto">Hướng dẫn sử dụng AI hiệu quả, an toàn và có trách nhiệm trong học tập.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                <GuideCard 
                    title={t('sg_topic_1')} 
                    desc={t('sg_desc_1')} 
                    color="blue"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <GuideCard 
                    title={t('sg_topic_2')} 
                    desc={t('sg_desc_2')} 
                    color="red"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                />
                <GuideCard 
                    title={t('sg_topic_3')} 
                    desc={t('sg_desc_3')} 
                    color="green"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                 <GuideCard 
                    title={t('sg_topic_4')} 
                    desc={t('sg_desc_4')} 
                    color="purple"
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                />
            </div>
        </div>
    );
};

export default SafetyGuide;
