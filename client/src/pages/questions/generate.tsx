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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function GenerateQuestions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [prompt, setPrompt] = useState<string>("");
  const [mode, setMode] = useState<"quick" | "advanced">("advanced");

  const handleGenerate = async () => {
    if (mode === "advanced" && !prompt.trim()) {
      toast({
        title: "Введите промпт",
        description: "Для генерации вопросов необходимо ввести промпт",
        variant: "destructive",
      });
      return;
    }

    if (mode === "advanced" && (questionCount < 1 || questionCount > 20)) {
      toast({
        title: "Некорректное количество вопросов",
        description: "Количество вопросов должно быть от 1 до 20",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ 
          count: questionCount, 
          prompt: prompt.trim()
        }),
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
    <div className="container mx-auto py-6 space-y-6">
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
          <CardTitle>Создание новых вопросов</CardTitle>
          <CardDescription>
            Настройте параметры для генерации вопросов
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Промпт для генерации</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Например: Сгенерируй сложные вопросы по истории России 20 века"
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Количество вопросов (1-20)</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={questionCount}
                onChange={(e) => setQuestionCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
                placeholder="Введите количество вопросов"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              size="lg"
              className="w-full"
            >
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isGenerating ? "Генерация..." : "Сгенерировать вопросы"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}