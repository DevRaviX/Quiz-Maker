
export interface Question {
  id: number;
  questionBankId: number;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export interface QuestionBank {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
}

export interface QuizResult {
  questionBank: QuestionBank;
  questions: Question[];
  userAnswers: number[];
  score: number;
  totalQuestions: number;
  dateCompleted: Date;
}

export interface QuizHistory {
    id?: number;
    bankId: number;
    bankName: string;
    score: number;
    totalQuestions: number;
    percentage: number;
    dateCompleted: Date;
}
