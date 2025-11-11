import React, { useState, useEffect } from 'react';
import { QuestionBank } from '../types';
import { getQuestionsForBank } from '../services/db';
import Button from './common/Button';

interface QuizConfigProps {
    bank: QuestionBank;
    onStartQuiz: (config: {
        questionCount: number;
        shouldShuffleQuestions: boolean;
        shouldShuffleOptions: boolean;
    }) => void;
    onExit: () => void;
}

const QuizConfig: React.FC<QuizConfigProps> = ({ bank, onStartQuiz, onExit }) => {
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [questionCount, setQuestionCount] = useState(10);
    const [shouldShuffleQuestions, setShouldShuffleQuestions] = useState(true);
    const [shouldShuffleOptions, setShouldShuffleOptions] = useState(true);

    useEffect(() => {
        const fetchQuestionCount = async () => {
            const questions = await getQuestionsForBank(bank.id);
            setTotalQuestions(questions.length);
            setQuestionCount(Math.min(10, questions.length));
        };
        fetchQuestionCount();
    }, [bank.id]);

    const handleStart = () => {
        onStartQuiz({
            questionCount: Math.min(questionCount, totalQuestions),
            shouldShuffleQuestions,
            shouldShuffleOptions,
        });
    };

    if (totalQuestions === 0) {
        return <div className="text-center p-10">Loading configuration...</div>;
    }

    return (
        <div className="max-w-lg mx-auto p-4 md:p-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-300">{bank.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{bank.description}</p>
                    </div>
                     <button onClick={onExit} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 text-sm font-medium">Back</button>
                </div>

                <div className="space-y-6 mt-6">
                    <div>
                        <label htmlFor="question-count" className="block text-lg font-medium text-slate-700 dark:text-slate-300">
                            Number of Questions: <span className="font-bold text-blue-600 dark:text-blue-400">{questionCount}</span>
                        </label>
                        <input
                            id="question-count"
                            type="range"
                            min="1"
                            max={totalQuestions}
                            value={questionCount}
                            onChange={(e) => setQuestionCount(Number(e.target.value))}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 mt-2"
                        />
                         <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>1</span>
                            <span>{totalQuestions}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label htmlFor="shuffle-questions" className="text-lg font-medium text-slate-700 dark:text-slate-300">Shuffle Questions</label>
                         <label htmlFor="shuffle-questions" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="shuffle-questions" className="sr-only peer" checked={shouldShuffleQuestions} onChange={() => setShouldShuffleQuestions(!shouldShuffleQuestions)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <label htmlFor="shuffle-options" className="text-lg font-medium text-slate-700 dark:text-slate-300">Shuffle Options</label>
                        <label htmlFor="shuffle-options" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="shuffle-options" className="sr-only peer" checked={shouldShuffleOptions} onChange={() => setShouldShuffleOptions(!shouldShuffleOptions)} />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <Button onClick={handleStart} className="w-full !mt-8 text-lg">
                        Start Quiz
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default QuizConfig;
