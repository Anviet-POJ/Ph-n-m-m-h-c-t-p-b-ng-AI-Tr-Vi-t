
import React from 'react';
import { Language, UserRole } from '../types';
import { LOCALIZATION_STRINGS } from '../constants';

interface RoleSelectionScreenProps {
  onRoleSelect: (role: UserRole) => void;
  language: Language;
}

const RoleButton: React.FC<{ label: string; onClick: () => void; icon: React.ReactNode }> = ({ label, onClick, icon }) => (
    <button
        onClick={onClick}
        className="relative z-50 w-64 px-6 py-4 text-xl font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-xl shadow-md backdrop-blur-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 flex flex-col items-center justify-center space-y-3 cursor-pointer"
    >
        {icon}
        <span>{label}</span>
    </button>
);

const RoleSelectionScreen: React.FC<RoleSelectionScreenProps> = ({ onRoleSelect, language }) => {
    const t = (key: string) => LOCALIZATION_STRINGS[language]?.[key] || LOCALIZATION_STRINGS[Language.EN][key];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-slate-800 p-4 relative z-10">
        <div className="text-center mb-16 relative z-30">
            <svg className="w-24 h-24 mx-auto mb-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            <h1 className="text-5xl font-bold text-slate-900">{t('im_a')}</h1>
        </div>
        <div className="flex flex-col sm:flex-row space-y-6 sm:space-y-0 sm:space-x-8 relative z-50">
            <RoleButton
                label={t('student')}
                onClick={() => onRoleSelect(UserRole.STUDENT)}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>}
            />
            <RoleButton
                label={t('teacher')}
                onClick={() => onRoleSelect(UserRole.TEACHER)}
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>}
            />
        </div>
    </div>
  );
};

export default RoleSelectionScreen;
