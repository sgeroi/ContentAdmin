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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function PackageCheck() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [content, setContent] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editorRef, setEditorRef] = useState<HTMLDivElement | null>(null);

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

  const extractTextContent = (content: any): string => {
    if (!content || !content.content) return '';

    return content.content.reduce((text: string, node: any) => {
      if (node.type === 'text') {
        return text + (node.text || '');
      } else if (node.content) {
        return text + extractTextContent({ content: node.content });
      }
      return text;
    }, '');
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
      const textContent = extractTextContent(content);
      console.log('Sending text content:', textContent); // Debug log

      const response = await fetch("/api/questions/spell-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textContent }),
      });

      const responseText = await response.text();
      console.log('Raw API response:', responseText); // Debug log

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      if (!result.corrections) {
        throw new Error('Missing corrections in response');
      }

      setLocation(`/packages/check/spelling-results?content=${encodeURIComponent(JSON.stringify(content))}&corrections=${encodeURIComponent(JSON.stringify(result.corrections))}`);
    } catch (error: any) {
      console.error('Spell check error:', error);
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
      const textContent = extractTextContent(content);
      console.log('Sending text content:', textContent); // Debug log

      const response = await fetch("/api/questions/fact-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textContent }),
      });

      const responseText = await response.text();
      console.log('Raw API response:', responseText); // Debug log

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', responseText);
        throw new Error(`Invalid response format: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      if (!result.analysis) {
        throw new Error('Missing analysis in response');
      }

      setLocation(`/packages/check/fact-check-results?content=${encodeURIComponent(JSON.stringify(content))}&analysis=${encodeURIComponent(JSON.stringify(result.analysis))}`);
    } catch (error: any) {
      console.error('Fact check error:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSavePDF = async () => {
    if (!editorRef) return;

    try {
      setIsProcessing(true);
      const canvas = await html2canvas(editorRef, {
        scale: 2,
        useCORS: true,
        logging: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save('package-content.pdf');

      toast({
        title: "Успех",
        description: "PDF успешно сохранен",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить PDF: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
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
            <div ref={setEditorRef}>
              <WysiwygEditor
                content={content}
                onChange={setContent}
                className="min-h-[400px]"
              />
            </div>
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
            onClick={handleSavePDF}
            disabled={isProcessing || Object.keys(content).length === 0}
            variant="outline"
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Сохранить PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}