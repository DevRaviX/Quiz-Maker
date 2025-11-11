
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getQuestionBank, getQuestionsForBank, addQuizResultToHistory } from '../services/db';
import { Question, QuestionBank, QuizResult, QuizHistory } from '../types';
import Button from './common/Button';
import CheckIcon from './icons/CheckIcon';
import XMarkIcon from './icons/XMarkIcon';
import SparklesIcon from './icons/SparklesIcon';
import { GOOGLE_AI_MODEL } from '../aiConfig';

interface QuizTakerProps {
  bankId: number;
  config: {
      questionCount: number;
      shouldShuffleQuestions: boolean;
      shouldShuffleOptions: boolean;
  };
  onQuizComplete: (result: QuizResult) => void;
  onExit: () => void;
}

const QuizTaker: React.FC<QuizTakerProps> = ({ bankId, config, onQuizComplete, onExit }) => {
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [isHintLoading, setIsHintLoading] = useState(false);

  const processedQuestions = useMemo(() => {
    if (!allQuestions.length) return [];
    
    let questionsToUse = [...allQuestions];
    
    if (config.shouldShuffleQuestions) {
      questionsToUse.sort(() => Math.random() - 0.5);
    }
    
    questionsToUse = questionsToUse.slice(0, config.questionCount);
    
    return questionsToUse.map(q => {
      if (config.shouldShuffleOptions) {
        const originalOptions = [...q.options];
        const mappedOptions = q.options.map((option, index) => ({ option, originalIndex: index }));
        mappedOptions.sort(() => Math.random() - 0.5);
        
        const newOptions = mappedOptions.map(item => item.option);
        const newCorrectAnswerIndex = mappedOptions.findIndex(item => item.originalIndex === q.correctAnswerIndex);

        return { ...q, options: newOptions, correctAnswerIndex: newCorrectAnswerIndex };
      }
      return q;
    });
  }, [allQuestions, config]);

  useEffect(() => {
    const loadQuizData = async () => {
      setIsLoading(true);
      const bank = await getQuestionBank(bankId);
      const questionsData = await getQuestionsForBank(bankId);
      if (bank && questionsData.length > 0) {
        setQuestionBank(bank);
        setAllQuestions(questionsData);
        setUserAnswers(new Array(Math.min(questionsData.length, config.questionCount)).fill(-1));
      }
      setIsLoading(false);
    };
    loadQuizData();
  }, [bankId, config.questionCount]);

  const handleOptionClick = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestionIndex] = index;
    setUserAnswers(updatedAnswers);
  };
  
  const handleProceed = useCallback(async () => {
    if (currentQuestionIndex < processedQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setHint(null);
    } else {
      const score = userAnswers.filter((answer, index) => answer !== -1 && answer === processedQuestions[index].correctAnswerIndex).length;
      if (questionBank) {
        const result: QuizResult = {
          questionBank,
          questions: processedQuestions,
          userAnswers,
          score,
          totalQuestions: processedQuestions.length,
          dateCompleted: new Date(),
        };
        const history: QuizHistory = {
            bankId: questionBank.id,
            bankName: questionBank.name,
            score,
            totalQuestions: processedQuestions.length,
            percentage: Math.round((score / processedQuestions.length) * 100),
            dateCompleted: result.dateCompleted,
        };
        await addQuizResultToHistory(history);
        onQuizComplete(result);
      }
    }
  }, [currentQuestionIndex, processedQuestions, userAnswers, questionBank, onQuizComplete]);

  const getHint = async () => {
      if (!import.meta.env.VITE_GOOGLE_API_KEY) {
          setHint("API key is not configured. Cannot fetch hint.");
          return;
      }
      setIsHintLoading(true);
      setHint(null);
      try {
        const currentQuestion = processedQuestions[currentQuestionIndex];
        const prompt = `Provide a short, one-sentence hint for the following multiple-choice question. Do NOT give away the answer or mention the correct option. Just give a clue. Question: "${currentQuestion.text}"`;
        const resp = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model: GOOGLE_AI_MODEL })
        });
        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Proxy error: ${resp.status} ${errText}`);
        }
        const { text } = await resp.json();
        setHint(text || "");
      } catch (error) {
        console.error("Hint generation failed:", error);
        setHint("Sorry, couldn't generate a hint right now.");
      } finally {
        setIsHintLoading(false);
      }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= '1' && event.key <= '4') {
        handleOptionClick(parseInt(event.key) - 1);
      }
      if (event.key === 'Enter' && isAnswered) {
        handleProceed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAnswered, handleProceed]);
  
  if (isLoading) {
    return <div className="text-center p-10">Loading Quiz...</div>;
  }

  if (!questionBank || processedQuestions.length === 0) {
    return (
      <div className="text-center p-10">
        <p>Could not load quiz or quiz has no questions.</p>
        <Button onClick={onExit} className="mt-4">Back to List</Button>
      </div>
    );
  }

  const currentQuestion = processedQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / processedQuestions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
       <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl relative overflow-hidden">
        
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-blue-800 dark:text-blue-300">{questionBank.name}</h1>
          <button onClick={onExit} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium z-10">Exit</button>
        </div>
        
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mb-4">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="mb-6">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Question {currentQuestionIndex + 1} of {processedQuestions.length}</span>
          <p className="text-lg md:text-xl font-medium mt-2 min-h-[60px]" dangerouslySetInnerHTML={{ __html: currentQuestion.text }} />
        </div>

        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isCorrectAnswer = index === currentQuestion.correctAnswerIndex;
            const isSelected = index === selectedOption;

            let buttonClass = 'w-full text-left p-4 border-2 rounded-lg transition-colors duration-200 flex items-center justify-between text-base';

            if (isAnswered) {
              if (isCorrectAnswer) {
                buttonClass += ' bg-green-100 dark:bg-green-900/50 border-green-500 text-green-800 dark:text-green-200 font-semibold';
              } else if (isSelected && !isCorrectAnswer) {
                buttonClass += ' bg-red-100 dark:bg-red-900/50 border-red-500 text-red-800 dark:text-red-200';
              } else {
                buttonClass += ' border-slate-300 dark:border-slate-600 opacity-60 cursor-default';
              }
            } else {
                 buttonClass += isSelected 
                ? ' border-blue-500 bg-blue-50 dark:bg-blue-900/50 ring-2 ring-blue-500'
                : ' border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700';
            }

            return (
              <button
                key={index}
                onClick={() => handleOptionClick(index)}
                disabled={isAnswered}
                className={buttonClass}
              >
                <span className="flex items-center">
                    <span className="mr-3 font-bold text-slate-500">{index + 1}.</span>
                    <span dangerouslySetInnerHTML={{ __html: option }} />
                </span>
                {isAnswered && isCorrectAnswer && <CheckIcon className="h-6 w-6 text-green-600" />}
                {isAnswered && isSelected && !isCorrectAnswer && <XMarkIcon className="h-6 w-6 text-red-600" />}
              </button>
            );
          })}
        </div>
        
        <div className="mt-4 flex justify-start items-center h-10">
            {!isAnswered && (
                <Button onClick={getHint} disabled={isHintLoading} variant="secondary" className="text-sm">
                    <SparklesIcon className="h-4 w-4 inline-block mr-1" />
                    {isHintLoading ? 'Thinking...' : 'Need a hint?'}
                </Button>
            )}
            {hint && (
                <div className="p-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-md">
                    <strong>Hint:</strong> {hint}
                </div>
            )}
        </div>

        {isAnswered && currentQuestion.explanation && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-md border-l-4 border-blue-400 animate-fade-in">
                <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300">Explanation</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1" dangerouslySetInnerHTML={{ __html: currentQuestion.explanation }} />
            </div>
        )}

        <div className="mt-8 text-right">
            <Button onClick={handleProceed} disabled={!isAnswered}>
                {currentQuestionIndex < processedQuestions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default QuizTaker;

// Add this to your global CSS if you have one, or a style tag.
const style = document.createElement('style');
style.innerHTML = `
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in {
    animation: fade-in 0.3s ease-out forwards;
  }
`;
document.head.appendChild(style);