import { forwardRef, useEffect, useRef } from 'react';

interface ContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const ContentEditor = forwardRef<HTMLDivElement, ContentEditorProps>(
  ({ value, onChange, className = '', placeholder = 'Введите текст...' }, ref) => {
    const editorRef = useRef<HTMLDivElement | null>(null);
    const innerRef = (ref as any) || editorRef;

    useEffect(() => {
      const div = innerRef.current;
      if (!div) return;

      const handlePaste = async (e: ClipboardEvent) => {
        e.preventDefault();

        const items = Array.from(e.clipboardData?.items || []);
        const imageItem = items.find(item => item.type.startsWith('image'));
        
        if (imageItem) {
          const file = imageItem.getAsFile();
          if (!file) return;

          try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('/api/uploads', {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });

            if (!response.ok) throw new Error(await response.text());

            const { url } = await response.json();
            document.execCommand('insertImage', false, url);
          } catch (error) {
            console.error('Failed to upload image:', error);
          }
        } else {
          // Handle text paste
          const text = e.clipboardData?.getData('text/html') || e.clipboardData?.getData('text');
          if (text) {
            document.execCommand('insertHTML', false, text);
          }
        }

        // Trigger onChange with new content
        onChange(div.innerHTML);
      };

      const handleInput = () => {
        onChange(div.innerHTML);
      };

      div.addEventListener('paste', handlePaste);
      div.addEventListener('input', handleInput);

      return () => {
        div.removeEventListener('paste', handlePaste);
        div.removeEventListener('input', handleInput);
      };
    }, [innerRef, onChange]);

    return (
      <div
        ref={innerRef}
        className={`min-h-[200px] p-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
        contentEditable
        dangerouslySetInnerHTML={{ __html: value }}
        placeholder={placeholder}
        suppressContentEditableWarning
      />
    );
  }
);

ContentEditor.displayName = 'ContentEditor';
