import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, Database, PlusCircle, ArrowUpDown, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Package, Question } from "@db/schema";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import debounce from "lodash/debounce";

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
  content: any;
  answer: string;
  topic: string;
  difficulty: number;
};

type QuestionSearchFilters = {
  query: string;
  author?: string;
  tag?: string;
  dateFrom?: string;
  dateTo?: string;
};

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);
  const [searchFilters, setSearchFilters] = useState<QuestionSearchFilters>({ query: "" });
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set());
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);

  const form = useForm<QuestionFormData>({
    defaultValues: {
      title: "",
      content: {},
      answer: "",
      topic: "",
      difficulty: 1,
    },
  });

  const searchForm = useForm<QuestionSearchFilters>({
    defaultValues: {
      query: "",
      author: "",
      tag: "",
      dateFrom: "",
      dateTo: "",
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
        setPackageData(packageResult);

        await fetchQuestions();
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

  const fetchQuestions = async (filters: QuestionSearchFilters = { query: "" }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.query) queryParams.append("q", filters.query);
      if (filters.author) queryParams.append("author", filters.author);
      if (filters.tag) queryParams.append("tag", filters.tag);
      if (filters.dateFrom) queryParams.append("from", filters.dateFrom);
      if (filters.dateTo) queryParams.append("to", filters.dateTo);

      const response = await fetch(`/api/questions?${queryParams}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const result = await response.json();
      setAvailableQuestions(result.questions);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const debouncedSearch = useCallback(
    debounce((filters: QuestionSearchFilters) => {
      fetchQuestions(filters);
    }, 300),
    []
  );

  const handleSearch = (data: QuestionSearchFilters) => {
    setSearchFilters(data);
    debouncedSearch(data);
  };

  const handleAutoSave = useCallback(
    debounce(async (questionId: number, data: Partial<QuestionFormData>) => {
      try {
        const response = await fetch(`/api/questions/${questionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to save question');
        }

        toast({
          title: "Сохранено",
          description: "Изменения автоматически сохранены",
        });
      } catch (error: any) {
        toast({
          title: "Ошибка автосохранения",
          description: error.message,
          variant: "destructive",
        });
      }
    }, 1000),
    []
  );

  const handleAddSelectedQuestions = async (roundId: number) => {
    try {
      for (const questionId of selectedQuestions) {
        await handleAddQuestion(roundId, questionId, 0);
      }
      setSelectedQuestions(new Set());
      setIsSearchDialogOpen(false);

      toast({
        title: "Успех",
        description: "Выбранные вопросы добавлены в раунд",
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
                            {question && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveQuestion(round.id, question.id)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Удалить
                              </Button>
                            )}
                          </div>

                          {question ? (
                            <div className="space-y-4">
                              <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Заголовок вопроса</FormLabel>
                                    <FormControl>
                                      <Input 
                                        defaultValue={question.title}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          handleAutoSave(question.id, { title: e.target.value });
                                        }}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormItem>
                                <FormLabel>Содержание вопроса</FormLabel>
                                <WysiwygEditor
                                  content={question.content}
                                  onChange={(content) => handleAutoSave(question.id, { content })}
                                />
                              </FormItem>
                              <FormField
                                control={form.control}
                                name="answer"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Ответ</FormLabel>
                                    <FormControl>
                                      <Input
                                        defaultValue={question.answer || ""}
                                        onChange={(e) => {
                                          field.onChange(e);
                                          handleAutoSave(question.id, { answer: e.target.value });
                                        }}
                                      />
                                    </FormControl>
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
                                        <Input
                                          defaultValue={question.topic}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            handleAutoSave(question.id, { topic: e.target.value });
                                          }}
                                        />
                                      </FormControl>
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
                                          defaultValue={question.difficulty}
                                          onChange={(e) => {
                                            field.onChange(e);
                                            handleAutoSave(question.id, { 
                                              difficulty: parseInt(e.target.value) 
                                            });
                                          }}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-4">
                              <Button
                                onClick={() => {
                                  form.reset();
                                  form.handleSubmit((data) =>
                                    handleSubmitQuestion(round.id, index, data)
                                  )();
                                }}
                              >
                                Написать вопрос
                              </Button>
                              <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button variant="outline">
                                    <Database className="h-4 w-4 mr-2" />
                                    Выбрать из базы
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl max-h-[80vh]">
                                  <DialogHeader>
                                    <DialogTitle>Поиск вопросов</DialogTitle>
                                    <DialogDescription>
                                      Найдите и выберите вопросы для добавления в раунд
                                    </DialogDescription>
                                  </DialogHeader>
                                  <Form {...searchForm}>
                                    <form 
                                      onSubmit={searchForm.handleSubmit(handleSearch)}
                                      className="space-y-4"
                                    >
                                      <div className="flex gap-4">
                                        <FormField
                                          control={searchForm.control}
                                          name="query"
                                          render={({ field }) => (
                                            <FormItem className="flex-1">
                                              <FormControl>
                                                <Input 
                                                  placeholder="Поиск по тексту..."
                                                  {...field}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={searchForm.control}
                                          name="author"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <Input 
                                                  placeholder="Автор"
                                                  {...field}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      <div className="flex gap-4">
                                        <FormField
                                          control={searchForm.control}
                                          name="tag"
                                          render={({ field }) => (
                                            <FormItem className="flex-1">
                                              <FormControl>
                                                <Input 
                                                  placeholder="Тег"
                                                  {...field}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={searchForm.control}
                                          name="dateFrom"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <Input 
                                                  type="date"
                                                  placeholder="От"
                                                  {...field}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                        <FormField
                                          control={searchForm.control}
                                          name="dateTo"
                                          render={({ field }) => (
                                            <FormItem>
                                              <FormControl>
                                                <Input 
                                                  type="date"
                                                  placeholder="До"
                                                  {...field}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                      </div>
                                      <Button type="submit">
                                        <Search className="h-4 w-4 mr-2" />
                                        Поиск
                                      </Button>
                                    </form>
                                  </Form>

                                  <ScrollArea className="h-[400px] mt-4">
                                    <div className="space-y-4">
                                      {availableQuestions.map((q) => {
                                        const isSelected = selectedQuestions.has(q.id);
                                        return (
                                          <div
                                            key={q.id}
                                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                              isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                                            }`}
                                            onClick={() => {
                                              const newSelected = new Set(selectedQuestions);
                                              if (isSelected) {
                                                newSelected.delete(q.id);
                                              } else {
                                                newSelected.add(q.id);
                                              }
                                              setSelectedQuestions(newSelected);
                                            }}
                                          >
                                            <div className="font-medium">{q.title}</div>
                                            <div className="text-sm text-muted-foreground">
                                              {q.topic} • {q.author?.username} • 
                                              {new Date(q.createdAt).toLocaleDateString()}
                                            </div>
                                            {isSelected && (
                                              <Badge className="mt-2">Выбрано</Badge>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </ScrollArea>

                                  <div className="mt-4 flex justify-end">
                                    <Button
                                      onClick={() => handleAddSelectedQuestions(round.id)}
                                      disabled={selectedQuestions.size === 0}
                                    >
                                      Добавить выбранные вопросы ({selectedQuestions.size})
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
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