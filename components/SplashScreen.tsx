
import React from 'react';
import { Language } from '../types';
import { LOCALIZATION_STRINGS } from '../constants';

interface SplashScreenProps {
  onLanguageSelect: (language: Language) => void;
}

const LanguageButton: React.FC<{ language: Language; label: string; onClick: () => void }> = ({ language, label, onClick }) => (
    <button
        onClick={onClick}
        className="w-48 px-6 py-3 text-lg font-semibold text-slate-700 bg-white border-2 border-slate-300 rounded-xl shadow-md backdrop-blur-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75 transition-all duration-300 transform hover:scale-105 relative z-50 cursor-pointer"
    >
        {label}
    </button>
);


const SplashScreen: React.FC<SplashScreenProps> = ({ onLanguageSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-transparent text-slate-800 p-4 relative z-50">
        <div className="text-center">
            {/* New "Lightbulb of Knowledge" logo, with a glowing filament and inner light. */}
            <svg className="w-72 h-72 mx-auto mb-8" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                    <radialGradient id="bulb-light" cx="0.5" cy="0.4" r="0.5">
                        <stop offset="0%" stopColor="white" stopOpacity="0.7"/>
                        <stop offset="60%" stopColor="#FEEA3A" stopOpacity="0.3"/>
                        <stop offset="100%" stopColor="#FACC15" stopOpacity="0.1"/>
                    </radialGradient>
                </defs>
                
                {/* The glass bulb */}
                <path 
                    d="M32 5C22.059 5 14 13.059 14 23c0 7.421 4.53 13.733 11 16.29V42h14v-2.71c6.47-2.557 11-8.869 11-16.29C50 13.059 41.941 5 32 5z" 
                    fill="url(#bulb-light)" 
                    stroke="#FACC15" 
                    strokeOpacity="0.6" 
                    strokeWidth="1.5" 
                />
                
                {/* The screw base (hilt) */}
                <g stroke="#FACC15" strokeWidth="1.5">
                    <line x1="21" y1="42" x2="43" y2="42" />
                    <line x1="23" y1="46" x2="41" y2="46" />
                    <line x1="24" y1="50" x2="40" y2="50" />
                    <line x1="25" y1="54" x2="39" y2="54" />
                </g>
                
                {/* The filament structure and its glow */}
                <g filter="url(#glow)">
                    {/* Support wires */}
                    <path d="M29 41.5 V 34" stroke="#FFE082" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <path d="M35 41.5 V 34" stroke="#FFE082" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    {/* Central post */}
                    <path d="M32 34 V 24" stroke="#FFE082" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    
                    {/* The actual filament coil */}
                    <path d="M29 34 C 29 29, 35 29, 35 34" stroke="#FFFFFF" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                    <path d="M29.5 31.5 C 29.5 27.5, 34.5 27.5, 34.5 31.5" stroke="#FFFFFF" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </g>
            </svg>
            <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 mb-2 pb-2">Trí Việt</h1>
            <p className="text-xl text-slate-600 mb-16">{LOCALIZATION_STRINGS[Language.VI].slogan}</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 relative z-50">
            <LanguageButton language={Language.VI} label="Tiếng Việt" onClick={() => onLanguageSelect(Language.VI)} />
            <LanguageButton language={Language.EN} label="English" onClick={() => onLanguageSelect(Language.EN)} />
            <LanguageButton language={Language.ZH} label="中国人" onClick={() => onLanguageSelect(Language.ZH)} />
            <LanguageButton language={Language.FR} label="Français" onClick={() => onLanguageSelect(Language.FR)} />
        </div>
    </div>
  );
};

export default SplashScreen;
