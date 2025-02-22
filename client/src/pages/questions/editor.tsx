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
import { useState, useEffect } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useTags } from "@/hooks/use-tags";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type FormData = {
  content: any;
  topic: string;
  difficulty: string;
  answer: string;
  tags: string[];
  comment: string; // Added comment field
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

export default function QuestionEditor({ id }: { id?: string }) {
  const [, setLocation] = useLocation();
  const { createQuestion, updateQuestion, validateQuestion, factCheckQuestion, questions } = useQuestions();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [isFactChecking, setIsFactChecking] = useState(false);
  const { tags } = useTags();

  const form = useForm<FormData>({
    defaultValues: {
      content: {},
      topic: "",
      difficulty: "1",
      answer: "",
      tags: [],
      comment: "", // Added default value for comment
    },
  });

  useEffect(() => {
    if (id) {
      const question = questions.find(q => q.id === parseInt(id));
      if (question) {
        form.reset({
          content: question.content,
          topic: question.topic,
          difficulty: question.difficulty.toString(),
          answer: question.answer || "",
          tags: question.questionTags?.map(qt => qt.tag.id.toString()) || [],
          comment: question.comment || "", // Added comment reset
        });
      }
    }
  }, [id, questions, form]);

  const handleCancel = () => {
    setLocation("/questions");
  };

  const handleValidateAndCorrect = async (data: FormData) => {
    setIsValidating(true);
    try {
      const result = await validateQuestion({
        title: "Временный заголовок",
        content: data.content,
        topic: data.topic,
      });

      form.setValue("content", result.correctedContent, { shouldValidate: true });

      if (result.suggestions.length > 0) {
        toast({
          title: "Текст исправлен",
          description: (
            <div className="mt-2 space-y-1">
              <p>Внесены следующие исправления:</p>
              <ul className="list-disc pl-4">
                {result.suggestions.map((correction, i) => (
                  <li key={i} className="text-sm">
                    {correction}
                  </li>
                ))}
              </ul>
            </div>
          ),
          duration: 5000,
        });
      } else {
        toast({
          title: "Проверка завершена",
          description: "Ошибок не найдено.",
          duration: 3000,
        });
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleFactCheck = async (data: FormData) => {
    if (!data.content || Object.keys(data.content).length === 0) {
      toast({
        title: "Ошибка",
        description: "Заполните содержание вопроса перед проверкой",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setIsFactChecking(true);
    try {
      const result = await factCheckQuestion({
        title: "Временный заголовок",
        content: data.content,
        topic: data.topic,
        id: id ? parseInt(id) : undefined,
      });

      toast({
        title: "Результаты проверки",
        description: result.suggestions[0],
        duration: 5000,
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsFactChecking(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      const questionData = {
        ...data,
        title: "Вопрос",
        difficulty: parseInt(data.difficulty),
      };

      if (id) {
        await updateQuestion({
          id: parseInt(id),
          ...questionData,
        });
        toast({
          title: "Успех",
          description: "Вопрос успешно обновлен",
          duration: 3000,
        });
      } else {
        await createQuestion(questionData);
        toast({
          title: "Успех",
          description: "Вопрос успешно создан",
          duration: 3000,
        });
      }
      setLocation("/questions");
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => setLocation("/questions")}
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Назад к списку
        </Button>
        <h1 className="text-3xl font-bold">
          {id ? "Редактировать вопрос" : "Создать вопрос"}
        </h1>
        <p className="text-muted-foreground">
          {id ? "Редактирование существующего вопроса" : "Создание нового вопроса для викторины"}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ответ</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Введите правильный ответ"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Комментарий</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Введите комментарий к вопросу"
                    {...field}
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
                    value={field.value}
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
                    value={field.value}
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

          <FormField
            control={form.control}
            name="tags"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Теги</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant={field.value.includes(tag.id.toString()) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        const newTags = field.value.includes(tag.id.toString())
                          ? field.value.filter((t) => t !== tag.id.toString())
                          : [...field.value, tag.id.toString()];
                        field.onChange(newTags);
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
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
            <Button type="submit">
              {id ? "Сохранить изменения" : "Создать вопрос"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}