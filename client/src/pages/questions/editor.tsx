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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  const { createQuestion, validateQuestion } = useQuestions();
  const { toast } = useToast();
  const [validationResult, setValidationResult] = useState<any>(null);
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

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

      setValidationResult(result);

      if (result.isValid) {
        toast({
          title: "Успех",
          description: "Вопрос корректен и готов к сохранению",
        });
      } else {
        // Автоматически применяем исправления
        form.setValue("title", result.correctedTitle);
        form.setValue("content", result.correctedContent);
      }
      setShowValidationDialog(true);
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
            {validationResult?.isValid && (
              <Button type="submit">Сохранить</Button>
            )}
          </div>
        </form>
      </Form>

      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent className="max-w-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {validationResult?.isValid 
                ? "Проверка пройдена успешно" 
                : "Найдены и исправлены ошибки"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {validationResult?.spellingErrors?.length > 0 && (
                <div>
                  <p className="font-semibold">Исправленные орфографические ошибки:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.spellingErrors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.grammarErrors?.length > 0 && (
                <div>
                  <p className="font-semibold">Исправленные грамматические ошибки:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.grammarErrors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.punctuationErrors?.length > 0 && (
                <div>
                  <p className="font-semibold">Исправленные пунктуационные ошибки:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.punctuationErrors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.factualIssues?.length > 0 && (
                <div>
                  <p className="font-semibold">Фактические неточности:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.factualIssues.map((issue: string, i: number) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.suggestions?.length > 0 && (
                <div>
                  <p className="font-semibold">Рекомендации:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.suggestions.map((suggestion: string, i: number) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationResult?.citations?.length > 0 && (
                <div>
                  <p className="font-semibold">Источники:</p>
                  <ul className="list-disc pl-4">
                    {validationResult.citations.map((citation: string, i: number) => (
                      <li key={i}>{citation}</li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationDialog(false)}>
              {validationResult?.isValid ? "Продолжить" : "Понятно"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}