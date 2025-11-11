import React from 'react';

interface SimpleWysiwygProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
}

const SimpleWysiwyg: React.FC<SimpleWysiwygProps> = ({ textareaRef }) => {
    const wrapText = (tag: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const selectedText = text.substring(start, end);
        
        const before = text.substring(0, start);
        const after = text.substring(end);

        const newText = `${before}<${tag}>${selectedText}</${tag}>${after}`;
        
        // This is a simple implementation. For a more robust solution,
        // you would dispatch an input event to notify React of the change.
        // But for this controlled component, we will rely on the parent's state update.
        const event = new Event('input', { bubbles: true });
        textarea.value = newText;
        textarea.dispatchEvent(event);

        // Move cursor after the inserted text
        textarea.focus();
        textarea.setSelectionRange(end + 2 * tag.length + 5, end + 2 * tag.length + 5);
    };

    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 border border-b-0 border-slate-300 dark:border-slate-600 rounded-t-md">
            <button type="button" onClick={() => wrapText('b')} className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 font-bold" title="Bold">B</button>
            <button type="button" onClick={() => wrapText('i')} className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 italic" title="Italic">I</button>
            <button type="button" onClick={() => wrapText('code')} className="px-2 py-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 font-mono text-sm" title="Code">&lt;/&gt;</button>
        </div>
    );
};

export default SimpleWysiwyg;
