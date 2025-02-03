import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ContentEditor } from "@/components/content-editor";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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

  const handleSpellingCheck = async () => {
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
      setLocation('/verify/result', result as any);

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
      setLocation('/verify/result', result as any);

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
            Вставьте текст вопросов для проверки. Поддерживается вставка изображений из буфера обмена.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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