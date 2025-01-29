import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import DropCursor from "@tiptap/extension-drop-cursor";
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
  ImagePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useCallback } from "react";

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
  Image,
  DropCursor,
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
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Button
    type="button"
    variant={isActive ? "secondary" : "ghost"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className="h-8 w-8 p-0"
  >
    {children}
  </Button>
);

export function WysiwygEditor({
  content,
  onChange,
  className,
}: WysiwygEditorProps) {
  const addImage = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  }, []);

  const editor = useEditor({
    extensions,
    content,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[200px] p-4 rounded-md border bg-background",
      },
      handleDrop: async (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const images = Array.from(event.dataTransfer.files).filter((file) =>
            file.type.startsWith("image/")
          );

          if (images.length > 0) {
            event.preventDefault();
            const image = images[0]; // Take only the first image
            const url = await addImage(image);
            if (url) {
              const { tr } = view.state;
              const pos = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })?.pos;

              if (typeof pos === "number") {
                view.dispatch(
                  tr.insert(pos, editor?.schema.nodes.image.create({ src: url }))
                );
              }
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  // Эффект для обновления содержимого редактора при изменении props
  useEffect(() => {
    if (editor && content) {
      // Проверяем, отличается ли текущий контент от нового
      const currentContent = editor.getJSON();
      if (JSON.stringify(currentContent) !== JSON.stringify(content)) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = await addImage(file);
        if (url && editor) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1 border rounded-md p-1 bg-background">
        <MenuButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
        >
          <Bold className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
        >
          <Italic className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
        >
          <List className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
        >
          <ListOrdered className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
        >
          <Quote className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive("codeBlock")}
        >
          <Code className="h-4 w-4" />
        </MenuButton>
        <MenuButton onClick={handleImageUpload}>
          <ImagePlus className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo className="h-4 w-4" />
        </MenuButton>
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo className="h-4 w-4" />
        </MenuButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}