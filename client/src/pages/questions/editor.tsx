import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { useQuestions } from "@/hooks/use-questions";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type FormData = {
  title: string;
  content: any;
  topic: string;
  difficulty: string;
};

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

export default function QuestionEditor() {
  const [, setLocation] = useLocation();
  const { createQuestion, validateQuestion, factCheckQuestion } = useQuestions();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [isFactChecking, setIsFactChecking] = useState(false);

  const form = useForm<FormData>({
    defaultValues: {
      title: "",
      content: {},
      topic: "",
      difficulty: "1",
    },
  });

  const handleValidateAndCorrect = async (data: FormData) => {
    setIsValidating(true);
    try {
      const result = await validateQuestion({
        title: data.title,
        content: data.content,
        topic: data.topic,
      });

      // Автоматически применяем исправления
      form.setValue("title", result.correctedTitle, { shouldValidate: true });
      form.setValue("content", result.correctedContent, { shouldValidate: true });

      if (!result.isValid) {
        const corrections = [
          ...result.spellingErrors,
          ...result.grammarErrors,
          ...result.punctuationErrors,
        ].length;

        toast({
          title: "Исправления применены",
          description: `Исправлено ошибок: ${corrections}. Проверьте текст и сохраните вопрос.`,
        });
      } else {
        toast({
          title: "Проверка пройдена",
          description: "Вопрос корректен и готов к сохранению.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFactCheck = async (data: FormData) => {
    setIsFactChecking(true);
    try {
      const result = await factCheckQuestion({
        title: data.title,
        content: data.content,
        topic: data.topic,
      });

      // Автоматически применяем исправления
      form.setValue("title", result.correctedTitle, { shouldValidate: true });
      form.setValue("content", result.correctedContent, { shouldValidate: true });

      if (!result.isValid) {
        toast({
          title: "Найдены фактические неточности",
          description: result.factualIssues.join("\n\n"),
          variant: "destructive",
        });
      } else {
        toast({
          title: "Фактчекинг пройден",
          description: "Информация в вопросе корректна.",
        });
      }

      if (result.suggestions.length > 0) {
        toast({
          title: "Предложения по улучшению",
          description: result.suggestions.join("\n\n"),
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFactChecking(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      await createQuestion({
        ...data,
        difficulty: parseInt(data.difficulty),
      });
      toast({
        title: "Успех",
        description: "Вопрос успешно сохранен",
      });
      setLocation("/questions");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Создать вопрос</h1>
        <p className="text-muted-foreground">
          Создание нового вопроса для викторины
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Заголовок вопроса</FormLabel>
                <FormControl>
                  <Input placeholder="Введите заголовок вопроса" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Содержание вопроса</FormLabel>
                <FormControl>
                  <WysiwygEditor
                    content={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тема</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тему" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic} value={topic}>
                          {topic}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="difficulty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Уровень сложности</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите сложность" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          Уровень {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/questions")}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit(handleValidateAndCorrect)}
              disabled={isValidating}
            >
              {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Проверить
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={form.handleSubmit(handleFactCheck)}
              disabled={isFactChecking}
            >
              {isFactChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Фактчек
            </Button>
            <Button type="submit">Сохранить</Button>
          </div>
        </form>
      </Form>
    </div>
  );
}