
import React, { useState } from 'react';
import { Language } from '../types';
import { LOCALIZATION_STRINGS } from '../constants';

interface TermsScreenProps {
  onAgree: () => void;
  language: Language;
}

const TermsScreen: React.FC<TermsScreenProps> = ({ onAgree, language }) => {
  const [checked, setChecked] = useState(false);
  const t = (key: string) => LOCALIZATION_STRINGS[language]?.[key] || LOCALIZATION_STRINGS[Language.EN][key];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-slate-800 p-4">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-xl max-w-lg w-full border border-slate-200">
        <div className="text-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-indigo-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-slate-900">{t('terms_title')}</h1>
        </div>
        
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-6">
           <p className="text-slate-700 text-center italic font-medium text-lg leading-relaxed">
            "{t('terms_content')}"
           </p>
        </div>

        <div className="flex items-center justify-center mb-8">
          <input 
            id="agree-checkbox" 
            type="checkbox" 
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="agree-checkbox" className="ml-3 text-slate-700 font-medium cursor-pointer select-none">
            {t('i_agree')}
          </label>
        </div>

        <button
          onClick={onAgree}
          disabled={!checked}
          className={`w-full py-3 px-6 rounded-xl text-lg font-bold transition-all duration-300 transform ${
            checked 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-[1.02]' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          {t('continue')}
        </button>
      </div>
    </div>
  );
};

export default TermsScreen;
