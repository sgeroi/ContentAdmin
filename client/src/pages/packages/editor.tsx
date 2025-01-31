import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, Database, PlusCircle, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Package, Question } from "@db/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type PackageQuestion = Question & {
  author: { username: string };
};

type Round = {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  questions: PackageQuestion[];
  orderIndex: number;
};

type PackageWithRounds = Package & {
  rounds: Round[];
};

type QuestionFormData = {
  title: string;
  content: string;
  answer: string;
  topic: string;
  difficulty: number;
};

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const form = useForm<QuestionFormData>({
    defaultValues: {
      title: "",
      content: "",
      answer: "",
      topic: "",
      difficulty: 1,
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching package data...');
        const packageResponse = await fetch(`/api/packages/${params.id}`, {
          credentials: 'include'
        });
        if (!packageResponse.ok) {
          throw new Error('Failed to fetch package data');
        }
        const packageResult = await packageResponse.json();
        console.log('Package data received:', packageResult);
        setPackageData(packageResult);

        console.log('Fetching questions...');
        const questionsResponse = await fetch('/api/questions', {
          credentials: 'include'
        });
        if (!questionsResponse.ok) {
          throw new Error('Failed to fetch questions');
        }
        const questionsResult = await questionsResponse.json();
        console.log('Questions received:', questionsResult);
        setAvailableQuestions(questionsResult.questions);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleSubmitQuestion = async (roundId: number, position: number, data: QuestionFormData) => {
    try {
      const createQuestionResponse = await fetch('/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!createQuestionResponse.ok) {
        throw new Error('Failed to create question');
      }

      const newQuestion = await createQuestionResponse.json();
      await handleAddQuestion(roundId, newQuestion.id, position);
      form.reset();

      toast({
        title: "Успех",
        description: "Новый вопрос создан и добавлен в раунд",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddQuestion = async (roundId: number, questionId: number, position: number) => {
    try {
      console.log('Adding question:', { roundId, questionId, position });
      const response = await fetch(`/api/rounds/${roundId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          orderIndex: position,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add question to round');
      }

      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }

      toast({
        title: "Успех",
        description: "Вопрос добавлен в раунд",
      });
    } catch (error: any) {
      console.error('Error adding question:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveQuestion = async (roundId: number, questionId: number) => {
    try {
      console.log('Removing question:', { roundId, questionId });
      const response = await fetch(`/api/rounds/${roundId}/questions/${questionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove question from round');
      }

      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }

      toast({
        title: "Успех",
        description: "Вопрос удален из раунда",
      });
    } catch (error: any) {
      console.error('Error removing question:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!packageData) {
    return <div>Package not found</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/packages">
            <Button variant="ghost" className="pl-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад к пакетам
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{packageData.title}</h1>
          {packageData.description && (
            <p className="text-muted-foreground">{packageData.description}</p>
          )}
        </div>
      </div>

      {/* Rounds Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Раунды</CardTitle>
          <CardDescription>
            Обзор всех раундов в пакете. Нажмите на раунд, чтобы увидеть и отредактировать его вопросы.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {packageData.rounds.map((round) => (
              <div
                key={round.id}
                className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                onClick={() => setExpandedRound(expandedRound === round.id ? null : round.id)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Раунд {round.orderIndex + 1}: {round.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {round.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>
                      {round.questions.length} / {round.questionCount} вопросов
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Questions Editor */}
      <div className="space-y-6">
        {packageData.rounds.map((round) => (
          <Card
            key={round.id}
            className={expandedRound === round.id ? "" : "hidden"}
          >
            <CardHeader>
              <CardTitle>
                Раунд {round.orderIndex + 1}: {round.name}
              </CardTitle>
              <CardDescription>{round.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 p-4">
                  {Array.from({ length: Math.max(round.questionCount, round.questions.length) }).map((_, index) => {
                    const question = round.questions[index];
                    return (
                      <div
                        key={`${round.id}-${index}`}
                        className="rounded-lg border p-4"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                Слот {index + 1}
                              </h3>
                              {index >= round.questionCount && (
                                <Badge variant="secondary">Дополнительный вопрос</Badge>
                              )}
                            </div>
                          </div>

                          {question ? (
                            <div className="space-y-2">
                              <div className="font-medium">{question.title}</div>
                              <div className="text-sm text-muted-foreground">
                                {question.topic}
                              </div>
                              <div className="flex gap-2">
                                <Link href={`/questions/${question.id}`}>
                                  <Button variant="outline" size="sm">
                                    Редактировать
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveQuestion(round.id, question.id)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Удалить
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Form {...form}>
                                <form
                                  onSubmit={form.handleSubmit((data) =>
                                    handleSubmitQuestion(round.id, index, data)
                                  )}
                                  className="space-y-4"
                                >
                                  <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Заголовок вопроса</FormLabel>
                                        <FormControl>
                                          <Input placeholder="Введите заголовок" {...field} />
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
                                        <FormLabel>Текст вопроса</FormLabel>
                                        <FormControl>
                                          <Textarea
                                            placeholder="Введите текст вопроса"
                                            className="min-h-[100px]"
                                            {...field}
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
                                          <Textarea
                                            placeholder="Введите ответ"
                                            className="min-h-[100px]"
                                            {...field}
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <div className="flex gap-4">
                                    <FormField
                                      control={form.control}
                                      name="topic"
                                      render={({ field }) => (
                                        <FormItem className="flex-1">
                                          <FormLabel>Тема</FormLabel>
                                          <FormControl>
                                            <Input placeholder="Введите тему" {...field} />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={form.control}
                                      name="difficulty"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Сложность</FormLabel>
                                          <FormControl>
                                            <Input
                                              type="number"
                                              min={1}
                                              max={5}
                                              className="w-20"
                                              {...field}
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <Button type="submit">Создать вопрос</Button>
                                    <Sheet>
                                      <SheetTrigger asChild>
                                        <Button variant="outline">
                                          <Database className="h-4 w-4 mr-2" />
                                          Выбрать из базы
                                        </Button>
                                      </SheetTrigger>
                                      <SheetContent>
                                        <SheetHeader>
                                          <SheetTitle>Выбрать существующий вопрос</SheetTitle>
                                        </SheetHeader>
                                        <ScrollArea className="h-[600px]">
                                          <div className="space-y-4 py-4">
                                            {availableQuestions.map((q) => (
                                              <div
                                                key={q.id}
                                                className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                                                onClick={() => {
                                                  handleAddQuestion(round.id, q.id, index);
                                                }}
                                              >
                                                <div className="font-medium">{q.title}</div>
                                                <div className="text-sm text-muted-foreground">
                                                  {q.topic}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </ScrollArea>
                                      </SheetContent>
                                    </Sheet>
                                  </div>
                                </form>
                              </Form>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add Question Button */}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setExpandedRound(round.id)}
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Добавить дополнительный вопрос
                  </Button>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}