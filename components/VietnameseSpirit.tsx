import React, { useState } from 'react';
import { useApp } from '../App';
import MarkdownRenderer from './MarkdownRenderer';
import { ai, getFriendlyErrorMessage } from '../api';

type Category = 'history_heroes' | 'culture_intellect';

const VietnameseSpirit: React.FC = () => {
    const { t, language } = useApp();
    const [category, setCategory] = useState<Category | null>(null);
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExplore = async () => {
        if (!topic.trim() || !category) return;
        setIsLoading(true);
        setContent('');
        setError(null);

        try {
            const categoryPrompt = category === 'history_heroes' 
                ? 'Focus on the indomitable spirit, resilience, key events, heroic figures, and their significance in the nation\'s history of defending its sovereignty.' 
                : 'Focus on cultural achievements, intellectual figures, philosophical ideas, literary works, and their impact on the nation\'s identity and development.';

            const prompt = `
                Act as an expert historian and culturalist. Generate an inspiring and informative article about the topic: "${topic}".
                The article should fall under the category: "${t(category)}".
                
                **Analysis Focus:**
                ${categoryPrompt}
                
                **CRITICAL LANGUAGE RULE (MUST FOLLOW):**
                The user has explicitly selected **${language}** as their interface language.
                - The entire article, including all headings and explanations, **MUST be written in ${language}**.
                - **Do not output English unless ${language} is explicitly English.**
                - If the topic is related to another culture, you MUST still write the article in **${language}**.

                **Tone:** Engaging, respectful, and inspiring.
                **Structure:** Use Markdown headings (##, ###) for clear structure.
                **Depth:** Provide accurate, in-depth information.
                **Significance:** Conclude by summarizing the lasting impact.
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3.8-flash',
                contents: prompt,
            });

            setContent(response.text || '');

        } catch (e) {
            console.error("Error exploring topic:", e);
            setError(getFriendlyErrorMessage(e, language));
        } finally {
            setIsLoading(false);
        }
    };

    const CategoryCard: React.FC<{
        id: Category;
        title: string;
        description: string;
        icon: React.ReactNode;
    }> = ({ id, title, description, icon }) => (
        <button
            onClick={() => setCategory(id)}
            className="group relative flex flex-col items-center justify-center text-center p-6 bg-white/80 backdrop-blur-sm border-2 border-slate-200 shadow-sm rounded-2xl hover:border-indigo-400/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-300 transform hover:-translate-y-2"
        >
            <div className="mb-4 text-indigo-500 group-hover:text-indigo-600 transition-colors duration-300">{icon}</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
            <p className="text-slate-600 text-sm">{description}</p>
        </button>
    );

    if (!category) {
        return (
            <div className="flex flex-col items-center justify-center">
                 <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">{t('vietnamese_spirit')}</h2>
                    <p className="text-slate-600">Khám phá những giá trị làm nên một Việt Nam bất khuất và trí tuệ.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                    <CategoryCard
                        id="history_heroes"
                        title={t('history_heroes')}
                        description={t('desc_history_heroes')}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a.75.75 0 01.75.75v2.502a.75.75 0 01-1.5 0V4.25A.75.75 0 0110 3.5z" /><path fillRule="evenodd" d="M8.293 6.252a1.5 1.5 0 011.933.518l.245.41a.75.75 0 00.976.244l.411-.246a1.5 1.5 0 011.595 2.182l-.41.245a.75.75 0 00-.244.976l.245.411a1.5 1.5 0 01-2.182 1.595l-.411-.245a.75.75 0 00-.976.244l-.245.41a1.5 1.5 0 01-2.518-1.933l.245-.41a.75.75 0 00.244-.976l-.41-.245a1.5 1.5 0 012.182-1.595l.41.245a.75.75 0 00.976-.244l-.245-.411a1.5 1.5 0 01.585-.518zM5 10a.75.75 0 01.75-.75h2.502a.75.75 0 010 1.5H5.75A.75.75 0 015 10zm9.25.75a.75.75 0 00-1.5 0v2.502a.75.75 0 001.5 0V10.75zM10 15a.75.75 0 01.75-.75h2.502a.75.75 0 010 1.5H10.75A.75.75 0 0110 15z" clipRule="evenodd" /><path d="M3.5 10a.75.75 0 000 1.5h.002a.75.75 0 000-1.5H3.5zm1.518 5.213a.75.75 0 01.482-.976l.41-.245a1.5 1.5 0 00-1.595-2.182l-.411.245a.75.75 0 01-.976-.482l-.245-.411a1.5 1.5 0 00-2.182 1.595l.245.41a.75.75 0 01.482.976l-.41.245a1.5 1.5 0 001.595 2.182l.411-.245a.75.75 0 01.976-.482l.245-.41z" /></svg>}
                    />
                    <CategoryCard
                        id="culture_intellect"
                        title={t('culture_intellect')}
                        description={t('desc_culture_intellect')}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" viewBox="0 0 20 20" fill="currentColor"><path d="M10.75 2.75a.75.75 0 00-1.5 0v8.586l-1.22-1.22a.75.75 0 00-1.06 1.06l2.5 2.5a.75.75 0 001.06 0l2.5-2.5a.75.75 0 10-1.06-1.06l-1.22 1.22V2.75z" /><path d="M3.5 9.75a.75.75 0 00-1.5 0v4.5a2 2 0 002 2h12a2 2 0 002-2v-4.5a.75.75 0 00-1.5 0v4.5a.5.5 0 01-.5.5H5a.5.5 0 01-.5-.5v-4.5z" /></svg>}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center mb-4">
                <button onClick={() => setCategory(null)} className="flex items-center text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    {t('back_to_selection')}
                </button>
            </div>
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Input Section */}
                <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-6 rounded-2xl">
                    <h3 className="text-xl font-semibold text-slate-900 mb-4">{t(category)}</h3>
                    <div className="space-y-4">
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={t('explore_topic_placeholder')}
                            className="w-full h-32 p-4 bg-slate-100 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition resize-none"
                        />
                        <button onClick={handleExplore} disabled={isLoading || !topic.trim()} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-300 transform hover:scale-105">
                            {isLoading ? t('generating') : t('explore')}
                        </button>
                    </div>
                </div>
                {/* Output Section */}
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm p-2 rounded-2xl min-h-[600px]">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center h-full text-red-600 p-4 text-center">{error}</div>
                    ) : (
                        <div className="h-full overflow-y-auto bg-white rounded-lg custom-scrollbar">
                            <MarkdownRenderer markdown={content} placeholder={t('spirit_placeholder')} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VietnameseSpirit;