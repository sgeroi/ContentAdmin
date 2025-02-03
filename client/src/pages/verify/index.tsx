import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { useToast } from "@/hooks/use-toast";
import { useQuestions } from "@/hooks/use-questions";
import { Loader2 } from "lucide-react";

export default function VerifyContent() {
  const [content, setContent] = useState<any>({});
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const { toast } = useToast();
  const { validateQuestion, factCheckQuestion } = useQuestions();

  const handleSpellingCheck = async () => {
    if (!content || Object.keys(content).length === 0) {
      toast({
        title: "Ошибка",
        description: "Заполните текст для проверки",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      const result = await validateQuestion({
        title: "Временный заголовок",
        content: content,
        topic: "",
      });

      setContent(result.correctedContent);
      setResults(result.suggestions);

      if (result.suggestions.length === 0) {
        toast({
          title: "Проверка завершена",
          description: "Ошибок не найдено",
        });
      }
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
    if (!content || Object.keys(content).length === 0) {
      toast({
        title: "Ошибка",
        description: "Заполните текст для проверки",
        variant: "destructive",
      });
      return;
    }

    setIsChecking(true);
    try {
      const result = await factCheckQuestion({
        title: "Временный заголовок",
        content: content,
        topic: "",
      });

      setResults(result.suggestions);
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
          <WysiwygEditor
            content={content}
            onChange={setContent}
            className="min-h-[400px]"
            uploadEndpoint="/api/uploads"
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

          {results.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Результаты проверки</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap font-mono text-sm">
                  {results.map((result, index) => (
                    <div key={index} className="mb-2">
                      {result}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}