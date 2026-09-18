
import React from 'react';
import { Language, StudentGoal } from '../types';
import { LOCALIZATION_STRINGS, STUDENT_GOALS } from '../constants';

interface GoalSelectionScreenProps {
  onGoalSelect: (goal: StudentGoal) => void;
  language: Language;
}

const GoalButton: React.FC<{ label: string; onClick: () => void; icon: React.ReactNode }> = ({ label, onClick, icon }) => (
    <button
        onClick={onClick}
        className="relative z-50 w-64 px-6 py-4 text-xl font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-xl shadow-md backdrop-blur-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center space-y-3 cursor-pointer"
    >
        {icon}
        <span>{label}</span>
    </button>
);

const GoalSelectionScreen: React.FC<GoalSelectionScreenProps> = ({ onGoalSelect, language }) => {
    const t = (key: string) => LOCALIZATION_STRINGS[language]?.[key] || LOCALIZATION_STRINGS[Language.EN][key];

    const icons = {
        [StudentGoal.GOOD]: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
        [StudentGoal.EXCELLENT]: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>,
        [StudentGoal.OUTSTANDING]: <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
    };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-slate-800 p-4 relative z-10">
        <div className="text-center mb-16 relative z-30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mx-auto mb-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2V7a2 2 0 00-2-2H5zM5 14a2 2 0 00-2 2v3a2 2 0 002 2h3a2 2 0 002-2v-3a2 2 0 00-2-2H5z" /></svg>
            <h1 className="text-5xl font-bold text-slate-900">{t('select_goal')}</h1>
        </div>
        <div className="flex flex-col sm:flex-row space-y-6 sm:space-y-0 sm:space-x-8 relative z-30">
            {STUDENT_GOALS.map(goal => (
                 <GoalButton
                    key={goal}
                    label={t(goal)}
                    onClick={() => onGoalSelect(goal)}
                    icon={icons[goal]}
                />
            ))}
        </div>
    </div>
  );
};

export default GoalSelectionScreen;
