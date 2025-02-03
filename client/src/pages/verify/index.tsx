import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContentEditor } from "@/components/content-editor";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload } from "lucide-react";
import { useLocation } from "wouter";

interface VerifyResult {
  correctedText: string;
  comments: Array<{
    text: string;
    correction: string;
    explanation: string;
  }>;
}

export default function VerifyContent() {
  const [content, setContent] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match('text.*')) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, загрузите текстовый файл",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      setContent(text);
      toast({
        title: "Файл загружен",
        description: "Текст из файла успешно загружен в редактор",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: "Не удалось прочитать файл: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleSpellingCheck = async () => {
    if (!content.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите текст или загрузите файл",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch("/api/verify/spelling", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json() as VerifyResult;
      setLocation('/verify/result', result);

    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleFactCheck = async () => {
    if (!content.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите текст или загрузите файл",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch("/api/verify/facts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json() as VerifyResult;
      setLocation('/verify/result', result);

    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Проверка контента</h1>
        <p className="text-muted-foreground">
          Проверка орфографии, пунктуации и фактов в вопросах
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Текст для проверки</CardTitle>
          <CardDescription>
            Вставьте текст вопросов для проверки или загрузите текстовый файл.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".txt,.doc,.docx"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              Загрузить файл
            </Button>
          </div>

          <ContentEditor
            value={content}
            onChange={setContent}
            className="min-h-[400px]"
          />

          <div className="flex gap-4">
            <Button 
              onClick={handleSpellingCheck}
              disabled={isChecking}
            >
              {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Проверить орфографию и пунктуацию
            </Button>
            <Button 
              onClick={handleFactCheck}
              disabled={isChecking}
              variant="secondary"
            >
              {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Проверить факты
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}