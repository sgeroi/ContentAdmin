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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const topics = [
  "История",
  "Наука",
  "География",
  "Литература",
  "Искусство",
  "Музыка",
  "Спорт",
  "Технологии",
];

export default function GenerateQuestions() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  const handleGenerate = async () => {
    if (!selectedTopic) {
      toast({
        title: "Выберите тему",
        description: "Для генерации вопросов необходимо выбрать тему",
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
        body: JSON.stringify({ count: 10, topic: selectedTopic }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const questions = await response.json();
      toast({
        title: "Успех",
        description: `Сгенерировано ${questions.length} новых вопросов по теме "${selectedTopic}"`,
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
            Выберите тему для генерации 10 новых вопросов разной сложности
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Тема вопросов</Label>
            <Select
              value={selectedTopic}
              onValueChange={setSelectedTopic}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тему для вопросов" />
              </SelectTrigger>
              <SelectContent>
                {topics.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedTopic}
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