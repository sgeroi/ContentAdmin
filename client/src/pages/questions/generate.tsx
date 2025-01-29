import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuestions } from "@/hooks/use-questions";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GenerateQuestions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ count: 10 }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const questions = await response.json();
      toast({
        title: "Успех",
        description: `Сгенерировано ${questions.length} новых вопросов`,
      });
      setLocation("/questions");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Генерация вопросов</h1>
          <p className="text-muted-foreground">
            Автоматическая генерация вопросов для викторины с помощью ИИ
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Создание нового пакета вопросов</CardTitle>
          <CardDescription>
            Будет создано 10 новых вопросов на логику разной сложности и на разные темы
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="lg"
            className="w-full"
          >
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isGenerating ? "Генерация..." : "Сгенерировать вопросы"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
