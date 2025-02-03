import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Upload, Check, Brain, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WysiwygEditor } from "@/components/wysiwyg-editor";

export default function PackageCheck() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [content, setContent] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      // Читаем содержимое файла
      const text = await file.text();
      try {
        // Пытаемся распарсить JSON если это сохраненный контент редактора
        const jsonContent = JSON.parse(text);
        setContent(jsonContent);
      } catch {
        // Если не JSON, устанавливаем как простой текст
        setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
      }
    }
  };

  const handleSpellCheck = async () => {
    if (!content || Object.keys(content).length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте текст или загрузите файл",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/questions/spell-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to check spelling");
      }

      const result = await response.json();
      // Перенаправляем на страницу с результатами проверки
      setLocation(`/packages/check/spelling-results?content=${encodeURIComponent(JSON.stringify(content))}&corrections=${encodeURIComponent(JSON.stringify(result.corrections))}`);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFactCheck = async () => {
    if (!content || Object.keys(content).length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте текст или загрузите файл",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/questions/fact-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error("Failed to fact check");
      }

      const result = await response.json();
      // Перенаправляем на страницу с результатами проверки
      setLocation(`/packages/check/fact-check-results?content=${encodeURIComponent(JSON.stringify(content))}&analysis=${encodeURIComponent(JSON.stringify(result.analysis))}`);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = () => {
    // Создаем файл для скачивания
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = "package-content.json";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/packages">
            <Button variant="ghost" className="mb-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад к пакетам
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Проверка пакета вопросов</h1>
          <p className="text-muted-foreground">
            Загрузите файл или вставьте текст для проверки
          </p>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-4">
          <div>
            <Label>Загрузить файл</Label>
            <Input
              type="file"
              onChange={handleFileChange}
              accept=".txt,.json"
            />
          </div>
          <div className="space-y-2">
            <Label>Или введите текст</Label>
            <WysiwygEditor
              content={content}
              onChange={setContent}
              className="min-h-[400px]"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleSpellCheck}
            disabled={isProcessing || Object.keys(content).length === 0}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Орфография и пунктуация
          </Button>
          <Button
            onClick={handleFactCheck}
            disabled={isProcessing || Object.keys(content).length === 0}
            className="flex-1"
          >
            <Brain className="mr-2 h-4 w-4" />
            Фактчек
          </Button>
          <Button
            onClick={handleSave}
            disabled={Object.keys(content).length === 0}
            variant="outline"
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Сохранить текст
          </Button>
        </div>
      </Card>
    </div>
  );
}