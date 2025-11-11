
import React from 'react';
import { QuizResult } from '../types';
import Button from './common/Button';
import CheckIcon from './icons/CheckIcon';
import XMarkIcon from './icons/XMarkIcon';

interface QuizResultProps {
  result: QuizResult;
  onRestart: (bankId: number) => void;
  onBackToList: () => void;
}

const QuizResultComponent: React.FC<QuizResultProps> = ({ result, onRestart, onBackToList }) => {
  const { score, totalQuestions, questionBank, questions, userAnswers } = result;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  const getResultColor = () => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-lg shadow-xl text-center">
        <h1 className="text-2xl font-bold mb-2">Quiz Complete!</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-4">Results for "{questionBank.name}"</p>
        
        <div className={`text-6xl font-bold ${getResultColor()}`}>{percentage}%</div>
        <p className="text-xl font-medium mt-2">You scored {score} out of {totalQuestions}</p>

        <div className="flex justify-center gap-4 mt-8">
          <Button onClick={() => onRestart(questionBank.id)} variant="secondary">Try Again</Button>
          <Button onClick={onBackToList}>Back to Quiz List</Button>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Review Your Answers</h2>
        <div className="space-y-4">
          {questions.map((q, index) => {
            const userAnswer = userAnswers[index];
            const isCorrect = userAnswer === q.correctAnswerIndex;

            return (
              <div key={q.id} className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-md">
                <p className="font-semibold mb-3" dangerouslySetInnerHTML={{ __html: `${index + 1}. ${q.text}` }}></p>
                <div className="space-y-2">
                  {q.options.map((option, optIndex) => {
                    const isUserChoice = userAnswer === optIndex;
                    const isCorrectAnswer = q.correctAnswerIndex === optIndex;
                    let classes = "flex items-center p-3 rounded-md ";

                    if (isCorrectAnswer) {
                      classes += "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 font-semibold";
                    } else if (isUserChoice && !isCorrect) {
                      classes += "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200";
                    } else {
                       classes += "bg-slate-100 dark:bg-slate-700";
                    }

                    return (
                        <div key={optIndex} className={classes}>
                           {isCorrectAnswer && <CheckIcon className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />}
                           {isUserChoice && !isCorrect && <XMarkIcon className="h-5 w-5 mr-2 text-red-600 dark:text-red-400" />}
                           <span className="flex-1" dangerouslySetInnerHTML={{ __html: option }}></span>
                           {isUserChoice && !isCorrectAnswer && <span className="text-xs font-medium ml-2">(Your Answer)</span>}
                        </div>
                    );
                  })}
                </div>
                {q.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md border-l-4 border-blue-400">
                        <h4 className="font-bold text-sm text-blue-800 dark:text-blue-300">Explanation</h4>
                        <p className="text-sm text-slate-700 dark:text-slate-300 mt-1" dangerouslySetInnerHTML={{ __html: q.explanation }}></p>
                    </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizResultComponent;