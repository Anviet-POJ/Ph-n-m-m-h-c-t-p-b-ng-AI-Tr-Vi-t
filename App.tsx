
import React, { useState, createContext, useContext, useEffect } from 'react';
import { Language, UserRole, StudentGoal, LibraryItem } from './types';
import { LOCALIZATION_STRINGS, STORAGE_LIMIT_BYTES } from './constants';
import SplashScreen from './components/SplashScreen';
import ApiKeyScreen from './components/ApiKeyScreen';
import MainLayout from './components/MainLayout';
import RoleSelectionScreen from './components/RoleSelectionScreen';
import GoalSelectionScreen from './components/GoalSelectionScreen';
import TermsScreen from './components/TermsScreen';
import { initializeAI } from './api';

interface AppContextType {
  language: Language;
  userRole: UserRole;
  studentGoal: StudentGoal | null;
  t: (key: string) => string;
  handleGoHome: () => void;
  handleResetLanguage: () => void;
  handleChangeApiKey: () => void;
  library: LibraryItem[];
  addToLibrary: (item: Omit<LibraryItem, 'id' | 'timestamp'>) => void;
  removeFromLibrary: (id: string) => void;
  libraryUsage: { used: number; total: number };
  handleViolation: (reasonKey: string) => void;
}

export const AppContext = createContext<AppContextType | null>(null);

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('triViet_apiKey'));
  const [language, setLanguage] = useState<Language | null>(null);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [studentGoal, setStudentGoal] = useState<StudentGoal | null>(null);
  
  const [isAccountLocked, setIsAccountLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [libraryUsage, setLibraryUsage] = useState({ used: 0, total: STORAGE_LIMIT_BYTES });

  useEffect(() => {
      initializeAI(apiKey || undefined);
      
      const agreed = localStorage.getItem('triViet_hasAgreedToTerms') === 'true';
      setHasAgreedToTerms(agreed);
      
      const storedLanguage = localStorage.getItem('triViet_language');
      if (storedLanguage) setLanguage(storedLanguage as Language);

      const storedViolationCount = localStorage.getItem('triViet_violationCount');
      if (storedViolationCount) setViolationCount(parseInt(storedViolationCount, 10));
      
      const storedLock = localStorage.getItem('triViet_isLocked') === 'true';
      const storedLockedUntil = localStorage.getItem('triViet_lockedUntil');
      const storedLockReason = localStorage.getItem('triViet_lockReason');

      if (storedLock) {
          if (storedLockedUntil) {
              const untilTimestamp = parseInt(storedLockedUntil, 10);
              if (Date.now() < untilTimestamp) {
                  setIsAccountLocked(true);
                  setLockedUntil(untilTimestamp);
                  if (storedLockReason) setLockReason(storedLockReason);
              } else {
                  setIsAccountLocked(false);
                  setLockedUntil(null);
                  setLockReason(null);
                  localStorage.removeItem('triViet_isLocked');
                  localStorage.removeItem('triViet_lockedUntil');
                  localStorage.removeItem('triViet_lockReason');
                  setViolationCount(0);
                  localStorage.setItem('triViet_violationCount', '0');
              }
          } else {
              setIsAccountLocked(true);
          }
      }
  }, [apiKey]);

  const t = (key: string): string => {
    const lang = language || Language.EN;
    return LOCALIZATION_STRINGS[lang]?.[key] || LOCALIZATION_STRINGS[Language.EN][key] || key;
  };
  
  const getLibraryStorageKey = (): string | null => {
      if (!userRole) return null;
      return `triVietLibrary_${userRole}`;
  }

  useEffect(() => {
    const key = getLibraryStorageKey();
    if (!key) return;
    
    const savedData = localStorage.getItem(key);
    if (savedData) {
        try {
            const items: LibraryItem[] = JSON.parse(savedData);
            setLibrary(items);
            const used = new TextEncoder().encode(savedData).length;
            setLibraryUsage({ used, total: STORAGE_LIMIT_BYTES });
        } catch (e) {
            setLibrary([]);
            setLibraryUsage({ used: 0, total: STORAGE_LIMIT_BYTES });
        }
    } else {
        setLibrary([]);
        setLibraryUsage({ used: 0, total: STORAGE_LIMIT_BYTES });
    }
  }, [userRole]);

  const handleApiKeySave = (key: string) => {
    setApiKey(key);
    localStorage.setItem('triViet_apiKey', key);
    initializeAI(key);
  };

  const handleLanguageSelect = (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    localStorage.setItem('triViet_language', selectedLanguage);
  };

  const handleTermsAgreement = () => {
    setHasAgreedToTerms(true);
    localStorage.setItem('triViet_hasAgreedToTerms', 'true');
  };

  const handleRoleSelect = (selectedRole: UserRole) => {
    setUserRole(selectedRole);
  };

  const handleGoalSelect = (selectedGoal: StudentGoal) => {
    setStudentGoal(selectedGoal);
  };

  const handleGoHome = () => {
    setUserRole(null);
    setStudentGoal(null);
  };

  const handleResetLanguage = () => {
    setLanguage(null);
    setUserRole(null);
    setStudentGoal(null);
    localStorage.removeItem('triViet_language');
  };

  const handleChangeApiKey = () => {
      setApiKey(null);
      localStorage.removeItem('triViet_apiKey');
  };

  const handleViolation = (reasonKey: string) => {
    if (isAccountLocked) return;
    const storedCount = parseInt(localStorage.getItem('triViet_violationCount') || '0', 10);
    const newCount = storedCount + 1;
    setViolationCount(newCount);
    localStorage.setItem('triViet_violationCount', String(newCount));

    if (newCount >= 2) {
        let duration = 3 * 24 * 60 * 60 * 1000;
        if (reasonKey === 'violation_reason_policy') {
             duration = 30 * 24 * 60 * 60 * 1000;
        }
        const unlockTime = Date.now() + duration;
        setIsAccountLocked(true);
        setLockedUntil(unlockTime);
        setLockReason(reasonKey);
        localStorage.setItem('triViet_isLocked', 'true');
        localStorage.setItem('triViet_lockedUntil', String(unlockTime));
        localStorage.setItem('triViet_lockReason', reasonKey);
    } else {
        setWarningMessage(`${t('violation_warning_msg')} (${newCount}/1)`);
    }
  };

  const addToLibrary = (itemData: Omit<LibraryItem, 'id' | 'timestamp'>) => {
      const key = getLibraryStorageKey();
      if (!key) return;
      const newItem: LibraryItem = { ...itemData, id: `${Date.now()}`, timestamp: Date.now() };
      const updatedLibrary = [newItem, ...library];
      const newLibraryString = JSON.stringify(updatedLibrary);
      const newSize = new TextEncoder().encode(newLibraryString).length;
      if (newSize > STORAGE_LIMIT_BYTES) {
          alert(t('storage_full'));
          return;
      }
      localStorage.setItem(key, newLibraryString);
      setLibrary(updatedLibrary);
      setLibraryUsage({ used: newSize, total: STORAGE_LIMIT_BYTES });
  };

  const removeFromLibrary = (id: string) => {
      const key = getLibraryStorageKey();
      if (!key) return;
      const updatedLibrary = library.filter(item => item.id !== id);
      const newLibraryString = JSON.stringify(updatedLibrary);
      const newSize = new TextEncoder().encode(newLibraryString).length;
      localStorage.setItem(key, newLibraryString);
      setLibrary(updatedLibrary);
      setLibraryUsage({ used: newSize, total: STORAGE_LIMIT_BYTES });
  };

  const formatDate = (timestamp: number) => {
      const d = new Date(timestamp);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  if (isAccountLocked) {
      const dateString = lockedUntil ? formatDate(lockedUntil) : '';
      return (
          <div className="fixed inset-0 bg-slate-900 z-[9999] flex items-center justify-center p-4 text-center">
              <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-4 border-red-500">
                  <div className="text-red-500 mb-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('account_locked_title')}</h2>
                  <p className="text-slate-600 mb-6 text-lg">{t('account_locked_message')}</p>
                  {lockReason && (
                      <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4 text-left">
                          <span className="font-bold text-amber-800 block text-xs uppercase">{t('lock_reason_label')}</span>
                          <span className="text-amber-900 font-medium">{t(lockReason)}</span>
                      </div>
                  )}
                  {lockedUntil && (
                      <div className="bg-red-50 p-4 rounded-lg border border-red-100 mb-6">
                          <p className="text-red-800 font-medium text-sm uppercase tracking-wider">{t('unlock_at')}</p>
                          <p className="text-xl font-bold text-red-600 mt-1">{dateString}</p>
                      </div>
                  )}
                  <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors">{t('contact_support')}</button>
              </div>
          </div>
      );
  }

  if (!language) return <SplashScreen onLanguageSelect={handleLanguageSelect} />;
  if (!hasAgreedToTerms) return <TermsScreen onAgree={handleTermsAgreement} language={language} />;
  if (!userRole) return <RoleSelectionScreen onRoleSelect={handleRoleSelect} language={language} />;
  if (userRole === UserRole.STUDENT && !studentGoal) return <GoalSelectionScreen onGoalSelect={handleGoalSelect} language={language} />;

  return (
    <AppContext.Provider value={{ language, userRole, studentGoal, t, handleGoHome, handleResetLanguage, handleChangeApiKey, library, addToLibrary, removeFromLibrary, libraryUsage, handleViolation }}>
      {warningMessage && (
        <div className="fixed inset-0 bg-black/60 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full border-l-8 border-amber-500 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start gap-4 mb-4">
                    <div className="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900">{t('violation_warning_title')}</h3>
                        <p className="text-slate-600 mt-2">{warningMessage}</p>
                    </div>
                </div>
                <button onClick={() => setWarningMessage(null)} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg">{t('understood')}</button>
            </div>
        </div>
      )}
      <MainLayout />
    </AppContext.Provider>
  );
};

export default App;
