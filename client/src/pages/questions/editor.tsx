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
import { useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useTags } from "@/hooks/use-tags";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type FormData = {
  content: any;
  difficulty: string;
  tags: string[];
  comment: string;
};

export default function QuestionEditor({ id }: { id?: string }) {
  const [, setLocation] = useLocation();
  const { createQuestion, updateQuestion, validateQuestion, factCheckQuestion, useQuestionQuery } = useQuestions();
  const { data: question, isLoading: isLoadingQuestion } = useQuestionQuery(id);
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [isFactChecking, setIsFactChecking] = useState(false);
  const { tags } = useTags();

  const form = useForm<FormData>({
    defaultValues: {
      content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }] },
      difficulty: "1",
      tags: [],
      comment: "",
    },
  });

  // Only update form when question data changes
  if (question && !form.getValues().content.content?.[0]?.content?.[0]?.text) {
    form.reset({
      content: question.content,
      difficulty: question.difficulty.toString(),
      tags: question.questionTags?.map(qt => qt.tag.id.toString()) || [],
      comment: question.comment || "",
    });
  }

  const handleCancel = () => {
    setLocation("/questions");
  };

  const handleValidateAndCorrect = async (data: FormData) => {
    setIsValidating(true);
    try {
      const result = await validateQuestion({
        title: "Временный заголовок",
        content: data.content,
        topic: "", // We still need to pass topic but it can be empty
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
    setIsFactChecking(true);
    try {
      const result = await factCheckQuestion({
        title: "Временный заголовок",
        content: data.content,
        topic: "",
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
        topic: "", // We still need to pass topic but it can be empty
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

  if (isLoadingQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

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

      {question?.packages && question.packages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Используется в пакетах</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {question.packages.map((pkg) => (
                <Badge key={pkg.id} variant="secondary">
                  {pkg.title}
                  {pkg.playDate && ` (${format(new Date(pkg.playDate), "PP")})`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

          <div className="grid gap-4 md:grid-cols-2">
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