
import React, { useState, useEffect } from 'react';
import { QuestionBank } from '../types';
import Button from './common/Button';
import { getQuestionsForBank } from '../services/db';

interface QuizListProps {
  questionBanks: QuestionBank[];
  onTakeQuiz: (bankId: number) => void;
}

const QuizList: React.FC<QuizListProps> = ({ questionBanks, onTakeQuiz }) => {
  const [questionCounts, setQuestionCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const fetchCounts = async () => {
        const counts: Record<number, number> = {};
        for (const bank of questionBanks) {
            const questions = await getQuestionsForBank(bank.id);
            counts[bank.id] = questions.length;
        }
        setQuestionCounts(counts);
    };
    fetchCounts();
  }, [questionBanks]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <h1 className="text-3xl font-bold text-center mb-6 text-blue-800 dark:text-blue-300">Available Quizzes</h1>
      {questionBanks.length === 0 ? (
        <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md">
          <p className="text-slate-500 dark:text-slate-400">No quizzes available.</p>
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">Go to the Admin Panel to create or import a quiz.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {questionBanks.map(bank => {
              const count = questionCounts[bank.id];
              const hasQuestions = count > 0;
            return (
                <div key={bank.id} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md flex flex-col justify-between">
                <div>
                    <h2 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">{bank.name}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{count === undefined ? 'Loading...' : `${count} Questions`}</p>
                    <p className="text-slate-600 dark:text-slate-400 mb-4 h-16 overflow-auto">{bank.description}</p>
                </div>
                <Button onClick={() => onTakeQuiz(bank.id)} className="w-full mt-auto" disabled={!hasQuestions}>
                    {hasQuestions ? 'Start Quiz' : 'No Questions'}
                </Button>
                </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default QuizList;
