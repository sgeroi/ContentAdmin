import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Upload, Check, Brain, Download } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function PackageCheck() {
  const { toast } = useToast();
  const [content, setContent] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [checkResults, setCheckResults] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      // Читаем содержимое файла
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleSpellCheck = async () => {
    if (!content) {
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
      setCheckResults(result.corrections);
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
    if (!content) {
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
      setCheckResults(result.analysis);
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
    const file = new Blob([checkResults], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "check-results.txt";
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
              accept=".txt,.doc,.docx"
            />
          </div>
          <div className="space-y-2">
            <Label>Или вставьте текст</Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[200px]"
              placeholder="Вставьте текст пакета вопросов..."
            />
          </div>
        </div>

        <div className="flex gap-4">
          <Button
            onClick={handleSpellCheck}
            disabled={isProcessing || !content}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Орфография и пунктуация
          </Button>
          <Button
            onClick={handleFactCheck}
            disabled={isProcessing || !content}
            className="flex-1"
          >
            <Brain className="mr-2 h-4 w-4" />
            Фактчек
          </Button>
          <Button
            onClick={handleSave}
            disabled={!checkResults}
            variant="outline"
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Сохранить результат
          </Button>
        </div>

        {checkResults && (
          <div className="space-y-2">
            <Label>Результаты проверки</Label>
            <ScrollArea className="h-[400px] border rounded-md p-4">
              <pre className="whitespace-pre-wrap">{checkResults}</pre>
            </ScrollArea>
          </div>
        )}
      </Card>
    </div>
  );
}
