import React, { useState, useEffect } from 'react';
import { getQuizHistory } from '../services/db';
import { QuizHistory } from '../types';
import Button from './common/Button';

interface ProgressTrackerProps {
    onBack: () => void;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ onBack }) => {
    const [history, setHistory] = useState<QuizHistory[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            const data = await getQuizHistory();
            setHistory(data);
            setIsLoading(false);
        };
        loadHistory();
    }, []);

    const getResultColor = (percentage: number) => {
        if (percentage >= 80) return 'text-green-500 dark:text-green-400';
        if (percentage >= 50) return 'text-yellow-500 dark:text-yellow-400';
        return 'text-red-500 dark:text-red-400';
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
             <div className="flex items-center mb-6">
                <Button onClick={onBack} variant="secondary" className="mr-4">{'< Back'}</Button>
                <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-300">My Progress</h1>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
                {isLoading ? (
                    <p className="text-center text-slate-500 dark:text-slate-400">Loading history...</p>
                ) : history.length === 0 ? (
                    <p className="text-center text-slate-500 dark:text-slate-400">No quiz history found. Take a quiz to see your progress!</p>
                ) : (
                    <div className="space-y-4">
                        {history.map((item, index) => (
                             <div key={item.id || index} className="p-4 border rounded-lg dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                    <p className="font-bold text-lg">{item.bankName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {new Date(item.dateCompleted).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className={`font-bold text-2xl ${getResultColor(item.percentage)}`}>
                                        {item.percentage}%
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Score: {item.score} / {item.totalQuestions}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressTracker;
