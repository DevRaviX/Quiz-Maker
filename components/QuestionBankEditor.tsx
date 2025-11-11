import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Question, QuestionBank } from '../types';
import { getQuestionsForBank, addQuestion, updateQuestion, deleteQuestion, updateQuestionBank } from '../services/db';
import Button from './common/Button';
import { useToast } from './common/ToastProvider';
import { useModal } from './common/ModalProvider';
import { GOOGLE_AI_MODEL } from '../aiConfig';
import SparklesIcon from './icons/SparklesIcon';
import SimpleWysiwyg from './common/SimpleWysiwyg';

interface QuestionBankEditorProps {
  bank: QuestionBank;
  onBack: () => void;
  refreshBanks: () => void;
}

const emptyQuestion: Omit<Question, 'id' | 'questionBankId'> = {
  text: '',
  options: ['', '', '', ''],
  correctAnswerIndex: 0,
  explanation: '',
};

const AIGenerator: React.FC<{ bankId: number; onComplete: () => void; onClose: () => void }> = ({ bankId, onComplete, onClose }) => {
    const [topic, setTopic] = useState('');
    const [numQuestions, setNumQuestions] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const showToast = useToast();

    const handleGenerate = async () => {
        if (!topic.trim()) {
            showToast("Please enter a topic.", 'error');
            return;
        }
    if (!import.meta.env.VITE_GOOGLE_API_KEY) {
      showToast("API key is not configured. Cannot generate questions.", 'error');
            return;
        }
        setIsLoading(true);

        try {
            // Call server-side proxy to keep API key secret
            const prompt = `Generate ${numQuestions} multiple-choice questions about "${topic}". For each question, provide: a 'text' (the question), an 'options' array with exactly 4 strings, a 'correctAnswerIndex' (0-3), and a brief 'explanation'. Return as a valid JSON array.`;
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
            const textContent = text || '';
            // Extract JSON from markdown code blocks if present
            const jsonMatch = textContent.match(/\[[\s\S]*\]/);
            const generatedQuestions: Omit<Question, 'id'>[] = JSON.parse(jsonMatch ? jsonMatch[0] : textContent);
            
            const importPromises = generatedQuestions.map(q => addQuestion({ ...q, questionBankId: bankId }));
            await Promise.all(importPromises);

            showToast(`${generatedQuestions.length} questions generated and added successfully!`, 'success');
            onComplete();

        } catch (error) {
            console.error("AI Generation failed:", error);
            showToast(`Failed to generate questions: ${(error as Error).message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Generate Questions with AI</h3>
                <div className="space-y-4">
                    <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a topic (e.g., 'Python Dictionaries')" className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600" />
                    <div>
                        <label htmlFor="num-questions" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Number of Questions: {numQuestions}</label>
                        <input id="num-questions" type="range" min="1" max="15" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button onClick={onClose} variant="secondary" disabled={isLoading}>Cancel</Button>
                        <Button onClick={handleGenerate} disabled={isLoading}>
                            {isLoading ? 'Generating...' : 'Generate'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const QuestionBankEditor: React.FC<QuestionBankEditorProps> = ({ bank, onBack, refreshBanks }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<Omit<Question, 'id' | 'questionBankId'> | Question | null>(null);
  const [editingBankDetails, setEditingBankDetails] = useState<QuestionBank>(bank);
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);

  const showToast = useToast();
  const showModal = useModal();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const explanationRef = useRef<HTMLTextAreaElement>(null);


  const fetchQuestions = useCallback(async () => {
    const qs = await getQuestionsForBank(bank.id);
    setQuestions(qs);
  }, [bank.id]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const filteredQuestions = useMemo(() => {
      return questions.filter(q => q.text.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [questions, searchQuery]);

  const handleSaveBankDetails = async () => {
    await updateQuestionBank(editingBankDetails);
    refreshBanks();
    showToast("Bank details updated.", 'success');
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editingQuestion.text.trim() || editingQuestion.options.some(o => !o.trim())) {
      showToast("Question and all options must be filled out.", 'error');
      return;
    }
    
    if ('id' in editingQuestion) {
      await updateQuestion(editingQuestion);
    } else {
      await addQuestion({ ...editingQuestion, questionBankId: bank.id });
    }
    
    setEditingQuestion(null);
    fetchQuestions();
  };

  const handleDeleteQuestion = async (id: number) => {
    showModal({
        title: "Delete Question",
        message: "Are you sure you want to delete this question?",
        onConfirm: async () => {
            await deleteQuestion(id);
            fetchQuestions();
            showToast("Question deleted.", 'success');
        }
    });
  };

  const parseCsvRow = (row: string): string[] => {
    const result: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (inQuotes) {
            if (char === '"' && row[i + 1] === '"') {
                field += '"'; i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                field += char;
            }
        } else {
            if (char === '"') { inQuotes = true; }
            else if (char === ',') { result.push(field); field = ''; }
            else { field += char; }
        }
    }
    result.push(field);
    return result;
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
        let importedCount = 0;
        const errors: string[] = [];
        for (let i = 0; i < rows.length; i++) {
          const rowNumber = i + 1;
          const columns = parseCsvRow(rows[i]);
          if (columns.length < 6) { errors.push(`Row ${rowNumber}: Invalid column count.`); continue; }
          const [text, o1, o2, o3, o4, correctIdxStr, explanation = ''] = columns.map(c => c.trim());
          if (!text || !o1 || !o2 || !o3 || !o4) { errors.push(`Row ${rowNumber}: Question text and all four options are required.`); continue; }
          const correctAnswerIndex = parseInt(correctIdxStr, 10);
          if (isNaN(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex > 3) { errors.push(`Row ${rowNumber}: Invalid correct answer index.`); continue; }
          await addQuestion({ questionBankId: bank.id, text, options: [o1, o2, o3, o4], correctAnswerIndex, explanation: explanation || '' });
          importedCount++;
        }
        
        let message = `${importedCount} of ${rows.length} questions imported.`;
        if (errors.length > 0) {
          message += `\n${errors.length} rows failed. See console for details.`;
          console.error("CSV Import Errors:", errors);
        }
        showToast(message, errors.length > 0 ? 'warning' : 'success');
        fetchQuestions();

      } catch (error) {
        showToast(`Failed to import questions: ${(error as Error).message}`, 'error');
      } finally {
        setIsImporting(false);
        if (event.target) event.target.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  const handleGenerateExplanation = async () => {
    if (!editingQuestion?.text) {
        showToast("Please provide a question text first.", "warning");
        return;
    }
  if (!import.meta.env.VITE_GOOGLE_API_KEY) {
    showToast("API key is not configured.", "error");
        return;
    }
    setIsExplanationLoading(true);
    try {
        const correctOptionText = editingQuestion.options[editingQuestion.correctAnswerIndex];
        const prompt = `Explain why "${correctOptionText}" is the correct answer to the question: "${editingQuestion.text}". Keep the explanation concise and clear.`;
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
        const textContent = text || '';
        updateQuestionField('explanation', textContent);
    } catch (error) {
        console.error("Explanation generation failed:", error);
        showToast("Failed to generate explanation.", "error");
    } finally {
        setIsExplanationLoading(false);
    }
  };  const updateQuestionField = <K extends keyof (typeof editingQuestion)>(field: K, value: (typeof editingQuestion)[K]) => {
      if (editingQuestion) {
          setEditingQuestion({...editingQuestion, [field]: value});
      }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {showAIGenerator && <AIGenerator bankId={bank.id} onClose={() => setShowAIGenerator(false)} onComplete={() => {setShowAIGenerator(false); fetchQuestions();}} />}
      
      <div className="flex items-center mb-6">
        <Button onClick={onBack} variant="secondary" className="mr-4">{'< Back'}</Button>
        <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-300">{editingBankDetails.name}</h1>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-2xl font-semibold mb-4">Bank Details</h2>
          <div className="flex flex-col gap-4">
               <input type="text" value={editingBankDetails.name} onChange={(e) => setEditingBankDetails({...editingBankDetails, name: e.target.value})} placeholder="Bank Name" className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600" />
              <textarea value={editingBankDetails.description} onChange={(e) => setEditingBankDetails({...editingBankDetails, description: e.target.value})} placeholder="Description" className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600" rows={2} />
              <div className="text-right">
                  <Button onClick={handleSaveBankDetails}>Save Details</Button>
              </div>
          </div>
      </div>
      
       <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-2xl font-semibold mb-4">Import Questions</h2>
         <div className="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
           <p>Upload a CSV file to add questions in bulk. Each row should follow the format: <code>question,opt1,opt2,opt3,opt4,correct_index,explanation</code>. The explanation is optional. Use double quotes for fields with commas.</p>
        </div>
        <div className="mt-4">
            <label className={`inline-block px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 cursor-pointer ${isImporting ? 'bg-slate-400' : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'}`}>
                <span>{isImporting ? 'Importing...' : 'Upload CSV'}</span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvImport} disabled={isImporting} />
            </label>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
          <h2 className="text-2xl font-semibold">Questions ({questions.length})</h2>
          <div className="flex gap-2">
            <Button onClick={() => setShowAIGenerator(true)} variant="secondary"><SparklesIcon className="h-5 w-5 mr-2 inline"/>Generate with AI</Button>
            <Button onClick={() => setEditingQuestion(emptyQuestion)}>Add Question</Button>
          </div>
        </div>
        
        <div className="mb-4">
            <input type="search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search questions..." className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"/>
        </div>

        {editingQuestion && (
          <form onSubmit={handleSaveQuestion} className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md border dark:border-slate-700">
            <h3 className="text-lg font-medium mb-2">{'id' in editingQuestion ? 'Edit' : 'Add'} Question</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Question Text</label>
                <SimpleWysiwyg textareaRef={textRef}/>
                <textarea ref={textRef} value={editingQuestion.text} onChange={(e) => updateQuestionField('text', e.target.value)} placeholder="Question Text" className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600" rows={3} required/>
              </div>

              {editingQuestion.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="radio" id={`correct-opt-${i}`} name="correctAnswer" checked={editingQuestion.correctAnswerIndex === i} onChange={() => updateQuestionField('correctAnswerIndex', i)} className="form-radio h-5 w-5 text-blue-600 focus:ring-blue-500"/>
                  <label htmlFor={`correct-opt-${i}`} className="sr-only">Set as correct</label>
                  <input type="text" value={opt} onChange={(e) => { const newOptions = [...editingQuestion.options]; newOptions[i] = e.target.value; updateQuestionField('options', newOptions); }} placeholder={`Option ${i + 1}`} className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600" required/>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-1">Explanation (optional)</label>
                <SimpleWysiwyg textareaRef={explanationRef}/>
                <textarea ref={explanationRef} value={editingQuestion.explanation || ''} onChange={(e) => updateQuestionField('explanation', e.target.value)} placeholder="Explanation" className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600" rows={2}/>
                <Button onClick={handleGenerateExplanation} type="button" variant="secondary" className="text-xs mt-1" disabled={isExplanationLoading}>
                    <SparklesIcon className="h-4 w-4 inline-block mr-1"/>
                    {isExplanationLoading ? "Generating..." : "Generate with AI"}
                </Button>
              </div>

              <div className="flex justify-end gap-2">
                <Button onClick={() => setEditingQuestion(null)} variant="secondary" type="button">Cancel</Button>
                <Button type="submit">Save Question</Button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {filteredQuestions.length > 0 ? filteredQuestions.map((q, index) => (
            <div key={q.id} className="p-4 border rounded-lg dark:border-slate-700" aria-labelledby={`question-text-${q.id}`}>
              <div className="font-semibold" id={`question-text-${q.id}`} dangerouslySetInnerHTML={{__html: `${index + 1}. ${q.text}`}}/>
              <div className="flex justify-end gap-2 mt-2">
                <Button onClick={() => setEditingQuestion(q)} variant="secondary">Edit</Button>
                <Button onClick={() => handleDeleteQuestion(q.id)} variant="danger">Delete</Button>
              </div>
            </div>
          )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">No questions found. Try adding one or clearing your search.</p>}
        </div>
      </div>
    </div>
  );
};

export default QuestionBankEditor;