import { openDB, IDBPDatabase, DBSchema } from 'idb';
import { Question, QuestionBank, QuizHistory } from '../types';
import { initialSeedData } from './seedData';


const DB_NAME = 'MCQQuizDB';
const DB_VERSION = 2; // Incremented version
const QUESTION_BANKS_STORE = 'questionBanks';
const QUESTIONS_STORE = 'questions';
const QUIZ_HISTORY_STORE = 'quizHistory';

interface QuizDB extends DBSchema {
  [QUESTION_BANKS_STORE]: {
    key: number;
    value: QuestionBank;
    indexes: { 'name': string };
  };
  [QUESTIONS_STORE]: {
    key: number;
    value: Question;
    indexes: { 'questionBankId': number };
  };
  [QUIZ_HISTORY_STORE]: {
    key: number;
    value: QuizHistory;
    indexes: { 'bankId': number, 'dateCompleted': Date };
  }
}

let dbPromise: Promise<IDBPDatabase<QuizDB>>;

function getDB(): Promise<IDBPDatabase<QuizDB>> {
  if (!dbPromise) {
    dbPromise = openDB<QuizDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains(QUESTION_BANKS_STORE)) {
            const store = db.createObjectStore(QUESTION_BANKS_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('name', 'name', { unique: true });
          }
          if (!db.objectStoreNames.contains(QUESTIONS_STORE)) {
            const store = db.createObjectStore(QUESTIONS_STORE, { keyPath: 'id', autoIncrement: true });
            store.createIndex('questionBankId', 'questionBankId');
          }
        }
        if (oldVersion < 2) {
             if (!db.objectStoreNames.contains(QUIZ_HISTORY_STORE)) {
                const store = db.createObjectStore(QUIZ_HISTORY_STORE, { keyPath: 'id', autoIncrement: true });
                store.createIndex('bankId', 'bankId');
                store.createIndex('dateCompleted', 'dateCompleted');
             }
        }
      },
    });
  }
  return dbPromise;
}

// Seeding Function
export async function seedDatabase(): Promise<void> {
    const SEED_FLAG = 'db_seeded_v1';
    if (localStorage.getItem(SEED_FLAG)) {
        return; // Already seeded
    }

    try {
        const db = await getDB();
        const bankCount = await db.count(QUESTION_BANKS_STORE);
        if (bankCount > 0) {
            localStorage.setItem(SEED_FLAG, 'true');
            return;
        }

        console.log("Performing initial database seed...");
    
        const { bank: bankInfo, questions: questionsData } = initialSeedData;
        const bankId = await addQuestionBank(bankInfo);

        const questionPromises = questionsData.map(q => {
            const questionToAdd: Omit<Question, 'id'> = {
                text: q.text,
                options: q.options,
                correctAnswerIndex: q.correctAnswerIndex,
                explanation: q.explanation,
                questionBankId: bankId,
            };
            return addQuestion(questionToAdd);
        });

        await Promise.all(questionPromises);
        
        localStorage.setItem(SEED_FLAG, 'true');
        console.log("Database seeded successfully.");
    } catch (error) {
        console.error("Database seeding failed:", error);
    }
}


// Question Bank Functions
export async function getAllQuestionBanks(): Promise<QuestionBank[]> {
  const db = await getDB();
  return db.getAll(QUESTION_BANKS_STORE);
}

export async function addQuestionBank(bank: Omit<QuestionBank, 'id' | 'createdAt'>): Promise<number> {
  const db = await getDB();
  const newBank = { ...bank, createdAt: new Date() };
  return db.add(QUESTION_BANKS_STORE, newBank as QuestionBank);
}

export async function updateQuestionBank(bank: QuestionBank): Promise<number> {
    const db = await getDB();
    return db.put(QUESTION_BANKS_STORE, bank);
}

export async function deleteQuestionBank(id: number): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([QUESTION_BANKS_STORE, QUESTIONS_STORE, QUIZ_HISTORY_STORE], 'readwrite');
  const questions = await tx.objectStore(QUESTIONS_STORE).index('questionBankId').getAll(id);
  for (const q of questions) {
    await tx.objectStore(QUESTIONS_STORE).delete(q.id);
  }
  const history = await tx.objectStore(QUIZ_HISTORY_STORE).index('bankId').getAll(id);
    for (const h of history) {
    if (h.id) await tx.objectStore(QUIZ_HISTORY_STORE).delete(h.id);
  }
  await tx.objectStore(QUESTION_BANKS_STORE).delete(id);
  await tx.done;
}

export async function getQuestionBank(id: number): Promise<QuestionBank | undefined> {
    const db = await getDB();
    return db.get(QUESTION_BANKS_STORE, id);
}


// Question Functions
export async function getQuestionsForBank(bankId: number): Promise<Question[]> {
  const db = await getDB();
  return db.getAllFromIndex(QUESTIONS_STORE, 'questionBankId', bankId);
}

export async function addQuestion(question: Omit<Question, 'id'>): Promise<number> {
  const db = await getDB();
  return db.add(QUESTIONS_STORE, question as Question);
}

export async function updateQuestion(question: Question): Promise<number> {
  const db = await getDB();
  return db.put(QUESTIONS_STORE, question);
}

export async function deleteQuestion(id: number): Promise<void> {
  const db = await getDB();
  return db.delete(QUESTIONS_STORE, id);
}

// History Functions
export async function addQuizResultToHistory(history: QuizHistory): Promise<number> {
    const db = await getDB();
    return db.add(QUIZ_HISTORY_STORE, history);
}

export async function getQuizHistory(): Promise<QuizHistory[]> {
    const db = await getDB();
    // Get all and sort by date descending
    const history = await db.getAll(QUIZ_HISTORY_STORE);
    return history.sort((a, b) => b.dateCompleted.getTime() - a.dateCompleted.getTime());
}

// Import/Export
export async function importData(data: { questionBanks: QuestionBank[], questions: Question[] }): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([QUESTION_BANKS_STORE, QUESTIONS_STORE], 'readwrite');
  await tx.objectStore(QUESTION_BANKS_STORE).clear();
  await tx.objectStore(QUESTIONS_STORE).clear();

  for (const bank of data.questionBanks) {
    bank.createdAt = new Date(bank.createdAt);
    await tx.objectStore(QUESTION_BANKS_STORE).put(bank);
  }
  for (const question of data.questions) {
    await tx.objectStore(QUESTIONS_STORE).put(question);
  }
  
  await tx.done;
}

export async function exportData(): Promise<{ questionBanks: QuestionBank[], questions: Question[] }> {
    const db = await getDB();
    const questionBanks = await db.getAll(QUESTION_BANKS_STORE);
    const questions = await db.getAll(QUESTIONS_STORE);
    return { questionBanks, questions };
}

export async function exportSingleBank(bankId: number): Promise<{ questionBanks: QuestionBank[], questions: Question[] } | null> {
    const db = await getDB();
    const bank = await db.get(QUESTION_BANKS_STORE, bankId);
    if (!bank) return null;
    const questions = await db.getAllFromIndex(QUESTIONS_STORE, 'questionBankId', bankId);
    return { questionBanks: [bank], questions };
}