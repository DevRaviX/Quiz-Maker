
import React, { useState } from 'react';
import { QuestionBank } from '../types';
import { addQuestionBank, deleteQuestionBank, exportData, importData as importDBData, exportSingleBank } from '../services/db';
import Button from './common/Button';
import QuestionBankEditor from './QuestionBankEditor';
import { useToast } from './common/ToastProvider';
import { useModal } from './common/ModalProvider';

interface AdminPanelProps {
  questionBanks: QuestionBank[];
  refreshBanks: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ questionBanks, refreshBanks }) => {
  const [editingBankId, setEditingBankId] = useState<number | null>(null);
  const [showNewBankForm, setShowNewBankForm] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankDescription, setNewBankDescription] = useState('');
  const [error, setError] = useState('');
  const showToast = useToast();
  const showModal = useModal();


  const handleCreateBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      setError('Bank name is required.');
      return;
    }
    await addQuestionBank({ name: newBankName, description: newBankDescription });
    setNewBankName('');
    setNewBankDescription('');
    setShowNewBankForm(false);
    setError('');
    refreshBanks();
    showToast('Question bank created successfully.', 'success');
  };
  
  const handleDeleteBank = (id: number, name: string) => {
    showModal({
        title: 'Delete Question Bank',
        message: `Are you sure you want to delete the "${name}" question bank and all its questions? This action cannot be undone.`,
        onConfirm: async () => {
            await deleteQuestionBank(id);
            refreshBanks();
            showToast(`"${name}" was deleted.`, 'success');
        },
    });
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "quiz-data-export-all.json";
      link.click();
      showToast('All data exported successfully.', 'success');
    } catch (err) {
      console.error("Export failed", err);
      showToast(`Export failed: ${(err as Error).message}`, 'error');
    }
  };
  
  const handleExportSingle = async (bankId: number, bankName: string) => {
     try {
      const data = await exportSingleBank(bankId);
      if (!data) throw new Error("Bank not found");
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = `${bankName.toLowerCase().replace(/\s+/g, '-')}-export.json`;
      link.click();
      showToast(`"${bankName}" exported successfully.`, 'success');
    } catch (err) {
      console.error("Export failed", err);
      showToast(`Export failed: ${(err as Error).message}`, 'error');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    showModal({
        title: 'Confirm Import',
        message: 'Importing a file will ERASE all current quiz data. Are you sure you want to continue?',
        onConfirm: () => {
            const reader = new FileReader();
            reader.onload = async (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not text");
                const data = JSON.parse(text);
                if (!data.questionBanks || !data.questions) throw new Error("Invalid file format");
                
                await importDBData(data);
                showToast("Import successful!", 'success');
                refreshBanks();
            } catch (err) {
                console.error("Import failed", err);
                showToast(`Import failed: ${(err as Error).message}`, 'error');
            } finally {
                event.target.value = ''; // Reset file input
            }
            };
            reader.readAsText(file);
        },
        onCancel: () => {
            event.target.value = ''; // Reset file input if user cancels
        }
    });
  };
  
  if (editingBankId !== null) {
    const bank = questionBanks.find(b => b.id === editingBankId);
    return bank ? (
      <QuestionBankEditor bank={bank} onBack={() => setEditingBankId(null)} refreshBanks={refreshBanks} />
    ) : null;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-blue-800 dark:text-blue-300">Admin Panel</h1>
        <div className="flex gap-2">
            <Button onClick={handleExport} variant="secondary">Export All</Button>
            <label className="px-4 py-2 rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 cursor-pointer">
                <span>Import</span>
                <input type="file" accept=".json" className="hidden" onChange={handleImport} />
            </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Question Banks</h2>
          <Button onClick={() => setShowNewBankForm(!showNewBankForm)}>
            {showNewBankForm ? 'Cancel' : 'New Bank'}
          </Button>
        </div>

        {showNewBankForm && (
          <form onSubmit={handleCreateBank} className="mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-medium mb-2">Create New Question Bank</h3>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                placeholder="Bank Name"
                className="w-full p-2 border rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
              />
              <textarea
                value={newBankDescription}
                onChange={(e) => setNewBankDescription(e.target.value)}
                placeholder="Description"
                className="w-full p-2 border rounded-md bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                rows={2}
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <div className="text-right">
                <Button type="submit">Save Bank</Button>
              </div>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {questionBanks.length > 0 ? questionBanks.map(bank => (
            <div key={bank.id} className="p-4 border rounded-lg dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-lg">{bank.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{bank.description}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button onClick={() => handleExportSingle(bank.id, bank.name)} variant="secondary" className="text-sm">Export</Button>
                <Button onClick={() => setEditingBankId(bank.id)} variant="secondary" className="text-sm">Edit</Button>
                <Button onClick={() => handleDeleteBank(bank.id, bank.name)} variant="danger" className="text-sm">Delete</Button>
              </div>
            </div>
          )) : <p className="text-slate-500 dark:text-slate-400 text-center py-4">No question banks yet.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;