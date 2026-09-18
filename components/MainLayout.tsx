
import React, { useState, Suspense } from 'react';
import { useApp } from '../App';
import { UserRole } from '../types';

import Summarizer from './Summarizer';
import ExamGenerator from './ExamGenerator';
import Chatbot from './Chatbot';
import Translator from './Translator';
import SlideGenerator from './SlideGenerator';
import LearningPath from './LearningPath';
import KnowledgeMastery from './KnowledgeMastery';
import QuestionAnalysis from './QuestionAnalysis';
import Library from './Library';
import SafetyGuide from './SafetyGuide';

const LoadingSpinner = () => (
    <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
    </div>
);

interface ErrorBoundaryProps {
    children: React.ReactNode;
    resetKey?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.error("Tab Error Boundary caught an error:", error, errorInfo);
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
            this.setState({ hasError: false, error: null });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-white/80 backdrop-blur-sm border border-red-200 rounded-2xl shadow-sm text-center max-w-xl mx-auto my-12">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Đã xảy ra sự cố khi tải tính năng này</h3>
                    <p className="text-slate-600 text-sm mb-5">Vui lòng bấm nút thử lại hoặc chuyển sang tính năng khác.</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                    >
                        Thử lại
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const MainLayout: React.FC = () => {
    const { t, userRole, studentGoal, handleGoHome, handleResetLanguage, handleChangeApiKey } = useApp();

    const studentFeatures = ['learning_path', 'knowledge_mastery', 'summarizer', 'exam_generator', 'question_analysis', 'translator', 'library', 'safety_guide'];
    const teacherFeatures = ['ai_assistant', 'exam_generator', 'slide_generator', 'summarizer', 'question_analysis', 'translator', 'library', 'safety_guide'];

    const availableFeatures = userRole === UserRole.STUDENT ? studentFeatures : teacherFeatures;
    
    // Ensure activeTab is valid
    const [activeTab, setActiveTab] = useState(availableFeatures[0]);

    const renderContent = () => {
        switch (activeTab) {
            case 'summarizer': return <Summarizer />;
            case 'exam_generator': return <ExamGenerator />;
            case 'ai_assistant': return <Chatbot />;
            case 'translator': return <Translator />;
            case 'slide_generator': return <SlideGenerator />;
            case 'learning_path': return <LearningPath />;
            case 'knowledge_mastery': return <KnowledgeMastery />;
            case 'question_analysis': return <QuestionAnalysis />;
            case 'library': return <Library />;
            case 'safety_guide': return <SafetyGuide />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-transparent text-slate-800 p-4 sm:p-6 lg:p-8 relative z-0">
            <header className="mb-6 flex justify-between items-center relative z-30">
                <div className="flex items-center gap-4">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Trí Việt</h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleGoHome}
                            title={t('go_home')}
                            aria-label={t('go_home')}
                            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </button>
                        <button
                            onClick={handleResetLanguage}
                            title={t('change_language')}
                            aria-label={t('change_language')}
                            className="p-2 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>
                </div>
                 <div className="text-right text-slate-600 text-sm">
                    <p>{t(userRole)}</p>
                    {userRole === UserRole.STUDENT && <p>{t('select_goal')}: <span className="font-bold text-indigo-600">{t(studentGoal!)}</span></p>}
                </div>
            </header>
            
            <nav className="border-b border-slate-200 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 relative z-30">
                <div className="flex flex-wrap -mb-px gap-x-1">
                   {availableFeatures.map(tab => {
                        let buttonText = t(tab);
                        if (userRole === UserRole.STUDENT && tab === 'exam_generator') {
                            buttonText = t('review_exercises');
                        }
                        if (tab === 'library') {
                            buttonText = userRole === UserRole.TEACHER ? t('documents') : t('library');
                        }
                        return (
                             <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 cursor-pointer ${
                                    activeTab === tab 
                                    ? 'bg-slate-200/50 text-indigo-600 border-b-2 border-indigo-500' 
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                            >
                                {buttonText}
                            </button>
                        )
                   })}
                </div>
            </nav>
            
            <main className="flex-grow relative z-10">
                <ErrorBoundary resetKey={activeTab}>
                    <Suspense fallback={<LoadingSpinner />}>
                        {renderContent()}
                    </Suspense>
                </ErrorBoundary>
            </main>
        </div>
    );
};

export default MainLayout;
