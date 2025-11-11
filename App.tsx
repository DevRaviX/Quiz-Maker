import React, { useState, useEffect, useCallback } from 'react';
import { getAllQuestionBanks, seedDatabase } from './services/db';
import { QuestionBank, QuizResult } from './types';
import AdminPanel from './components/AdminPanel';
import QuizList from './components/QuizList';
import QuizTaker from './components/QuizTaker';
import QuizResultComponent from './components/QuizResult';
import { ToastProvider } from './components/common/ToastProvider';
import { ModalProvider } from './components/common/ModalProvider';
import QuizConfig from './components/QuizConfig';
import ProgressTracker from './components/ProgressTracker';
import HistoryIcon from './components/icons/HistoryIcon';
import SunIcon from './components/icons/SunIcon';
import MoonIcon from './components/icons/MoonIcon';

type QuizConfigType = {
  questionCount: number;
  shouldShuffleQuestions: boolean;
  shouldShuffleOptions: boolean;
};

type ViewState = 
  | { mode: 'list' }
  | { mode: 'config'; bankId: number }
  | { mode: 'take'; bankId: number; config: QuizConfigType }
  | { mode: 'result'; result: QuizResult }
  | { mode: 'progress' };

const App: React.FC = () => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [viewState, setViewState] = useState<ViewState>({ mode: 'list' });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  
  const fetchQuestionBanks = useCallback(async () => {
    const banks = await getAllQuestionBanks();
    setQuestionBanks(banks);
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      await seedDatabase();
      await fetchQuestionBanks();
    };
    initializeApp();
  }, [fetchQuestionBanks]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      localStorage.removeItem('theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [theme]);
  
  const renderContent = () => {
    if (isAdminMode) {
      return <AdminPanel questionBanks={questionBanks} refreshBanks={fetchQuestionBanks} />;
    }

    switch (viewState.mode) {
      case 'config':
        const bank = questionBanks.find(b => b.id === viewState.bankId);
        return bank ? <QuizConfig bank={bank} onStartQuiz={(config) => setViewState({ mode: 'take', bankId: viewState.bankId, config })} onExit={() => setViewState({ mode: 'list' })} /> : null;
      case 'take':
        return <QuizTaker bankId={viewState.bankId} config={viewState.config} onQuizComplete={(result) => setViewState({ mode: 'result', result })} onExit={() => setViewState({ mode: 'list' })} />;
      case 'result':
        return <QuizResultComponent result={viewState.result} onRestart={(bankId) => setViewState({ mode: 'config', bankId })} onBackToList={() => setViewState({ mode: 'list' })} />;
      case 'progress':
          return <ProgressTracker onBack={() => setViewState({ mode: 'list' })} />;
      case 'list':
      default:
        return <QuizList questionBanks={questionBanks} onTakeQuiz={(bankId) => setViewState({ mode: 'config', bankId })} />;
    }
  };

  return (
    <ToastProvider>
      <ModalProvider>
        <div className="min-h-screen">
          <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-20">
            <div className="container mx-auto px-4 py-3 flex justify-between items-center">
              <button onClick={() => setViewState({mode: 'list'})} className="text-2xl font-bold text-blue-700 dark:text-blue-400">Intelligent MCQ</button>
              <div className="flex items-center space-x-4">
                <button onClick={() => setViewState({ mode: 'progress'})} className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400" title="View my progress">
                    <HistoryIcon />
                </button>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="text-slate-500 hover:text-blue-600 dark:hover:text-blue-400" title="Toggle theme">
                   {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                </button>
                <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-300 hidden sm:block">{isAdminMode ? 'Admin' : 'Student'}</span>
                    <label htmlFor="admin-toggle" className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="admin-toggle" className="sr-only peer" checked={isAdminMode} onChange={() => setIsAdminMode(!isAdminMode)} />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                    </label>
                </div>
              </div>
            </div>
          </header>
          <main className="mt-4">
            {renderContent()}
          </main>
          <footer className="text-center py-4 mt-8 text-sm text-slate-500 dark:text-slate-400">
              <p>Intelligent MCQ PWA - Fully offline capable.</p>
          </footer>
        </div>
      </ModalProvider>
    </ToastProvider>
  );
};

export default App;