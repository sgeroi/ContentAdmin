import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Button } from "./ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Code,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const extensions = [
  StarterKit.configure({
    bulletList: {
      keepMarks: true,
      keepAttributes: false,
    },
    orderedList: {
      keepMarks: true,
      keepAttributes: false,
    },
  }),
  Image.configure({
    HTMLAttributes: {
      class: 'rounded-lg max-w-full h-auto',
    },
  }),
];

type WysiwygEditorProps = {
  content: any;
  onChange: (content: any) => void;
  className?: string;
};

const MenuButton = ({
  onClick,
  isActive = false,
  disabled = false,
  children,
  tooltip,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  tooltip?: string;
}) => (
  <Button
    type="button"
    variant={isActive ? "secondary" : "ghost"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="h-8 w-8 p-0"
    title={tooltip}
  >
    {children}
  </Button>
);

export function WysiwygEditor({
  content,
  onChange,
  className,
}: WysiwygEditorProps) {
  const { toast } = useToast();

  const handleImageUpload = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "Ошибка",
        description: "Размер файла не должен превышать 5MB",
        variant: "destructive",
      });
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка загрузки изображения');
      }

      const { url } = await response.json();
      return url;
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const url = await handleImageUpload(file);
      if (url) {
        editor?.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  }, [handleImageUpload]);

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.indexOf('image') === 0) {
        event.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const url = await handleImageUpload(file);
        if (url) {
          editor?.chain().focus().setImage({ src: url }).run();
        }
        break;
      }
    }
  }, [handleImageUpload]);

  const editor = useEditor({
    extensions,
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 rounded-md border bg-background",
      },
      handlePaste: (view, event) => {
        handlePaste(event);
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  useEffect(() => {
    if (editor && content) {
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1 border rounded-md p-1 bg-background">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          tooltip="Жирный"
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          tooltip="Курсив"
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          tooltip="Маркированный список"
        >
          <List className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          tooltip="Нумерованный список"
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          tooltip="Цитата"
        >
          <Quote className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
          tooltip="Блок кода"
        >
          <Code className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={addImage}
          tooltip="Добавить изображение"
        >
          <ImageIcon className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          tooltip="Отменить"
        >
          <Undo className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          tooltip="Повторить"
        >
          <Redo className="h-4 w-4" />
        </MenuButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}