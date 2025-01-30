import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, Database, Search, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PackageQuestion = Question & {
  author: { username: string };
};

type Round = {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  questions: PackageQuestion[];
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
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<QuestionFormData>({
    defaultValues: {
      title: "",
      content: "",
      answer: "",
      topic: "",
      difficulty: 1,
    },
  });

  // New state for filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [sortBy, setSortBy] = useState<"title" | "topic" | "difficulty">("title");

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

  const handleSavePackage = async () => {
    if (!packageData) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/packages/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: packageData.title,
          description: packageData.description,
          rounds: packageData.rounds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save package');
      }

      toast({
        title: "Успех",
        description: "Пакет сохранен",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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

      // Refresh package data
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

      // Refresh package data
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
      // First create the question
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

      // Then add it to the round
      await handleAddQuestion(roundId, newQuestion.id, position);

      // Reset form
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

  // Get unique topics from available questions
  const uniqueTopics = Array.from(new Set(availableQuestions.map(q => q.topic))).filter(Boolean);

  // Filter and sort questions
  const filteredQuestions = availableQuestions
    .filter(q => {
      const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          q.topic.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTopic = !selectedTopic || q.topic === selectedTopic;
      const matchesDifficulty = !selectedDifficulty || q.difficulty.toString() === selectedDifficulty;
      return matchesSearch && matchesTopic && matchesDifficulty;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "topic") return a.topic.localeCompare(b.topic);
      if (sortBy === "difficulty") return a.difficulty - b.difficulty;
      return 0;
    });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!packageData) {
    return <div>Package not found</div>;
  }

  console.log('Rendering package data:', packageData);
  console.log('Available rounds:', packageData.rounds);

  // Create slots for questions in each round
  const questionSlots = packageData.rounds.flatMap((round, roundIndex) => {
    console.log(`Processing round ${roundIndex}:`, round);
    return Array.from({ length: round.questionCount }).map((_, questionIndex) => {
      const question = round.questions?.[questionIndex];
      console.log(`Slot ${questionIndex}:`, { roundId: round.id, question });
      return {
        roundId: round.id,
        roundName: round.name,
        roundIndex,
        questionIndex,
        question,
        totalQuestions: round.questionCount
      };
    });
  });

  console.log('Generated question slots:', questionSlots);

  return (
    <div className="container py-6 space-y-6">
      <div className="fixed top-0 left-0 right-0 bg-background border-b z-50">
        <div className="container py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/packages">
              <Button variant="ghost">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад к пакетам
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">{packageData.title}</h1>
          </div>
          <Button 
            onClick={handleSavePackage}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Сохранение...' : 'Сохранить пакет'}
          </Button>
        </div>
      </div>

      <div className="pt-16">
        {packageData.description && (
          <p className="text-muted-foreground mb-6">{packageData.description}</p>
        )}

        <div className="grid gap-4">
          {questionSlots.length > 0 ? (
            questionSlots.map((slot) => (
              <div
                key={`${slot.roundId}-${slot.questionIndex}`}
                className="rounded-lg border p-4"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">
                        Раунд {slot.roundIndex + 1}: {slot.roundName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Вопрос {slot.questionIndex + 1} из {slot.totalQuestions}
                      </p>
                    </div>
                  </div>

                  {slot.question ? (
                    <div className="space-y-2">
                      <div className="font-medium">{slot.question.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {slot.question.topic}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/questions/${slot.question.id}`}>
                          <Button variant="outline" size="sm">
                            Редактировать
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveQuestion(slot.roundId, slot.question.id)}
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
                          onChange={() => {
                            const data = form.getValues();
                            if (data.title && data.content && data.answer) {
                              handleSubmitQuestion(slot.roundId, slot.questionIndex, data);
                            }
                          }}
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
                          <div className="flex justify-end">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button variant="outline">
                                  <Database className="h-4 w-4 mr-2" />
                                  Выбрать из базы
                                </Button>
                              </SheetTrigger>
                              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                                <SheetHeader>
                                  <SheetTitle>Выбрать существующий вопрос</SheetTitle>
                                </SheetHeader>
                                <div className="py-4 space-y-4">
                                  {/* Search and Filters */}
                                  <div className="space-y-4">
                                    <div className="relative">
                                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                      <Input
                                        placeholder="Поиск вопросов..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8"
                                      />
                                    </div>

                                    <div className="flex gap-4">
                                      <div className="flex-1">
                                        <Select
                                          value={selectedTopic}
                                          onValueChange={setSelectedTopic}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Фильтр по теме" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="">Все темы</SelectItem>
                                            {uniqueTopics.map((topic) => (
                                              <SelectItem key={topic} value={topic}>
                                                {topic}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <div className="w-[180px]">
                                        <Select
                                          value={selectedDifficulty}
                                          onValueChange={setSelectedDifficulty}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Сложность" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="">Любая</SelectItem>
                                            {[1, 2, 3, 4, 5].map((level) => (
                                              <SelectItem key={level} value={level.toString()}>
                                                Уровень {level}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div>
                                      <Select
                                        value={sortBy}
                                        onValueChange={(value: "title" | "topic" | "difficulty") => setSortBy(value)}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="Сортировать по" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="title">По названию</SelectItem>
                                          <SelectItem value="topic">По теме</SelectItem>
                                          <SelectItem value="difficulty">По сложности</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {/* Questions List */}
                                  <ScrollArea className="h-[400px]">
                                    <div className="space-y-4">
                                      {filteredQuestions.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">
                                          Вопросы не найдены
                                        </div>
                                      ) : (
                                        filteredQuestions.map((q) => (
                                          <div
                                            key={q.id}
                                            className="p-4 border rounded-lg cursor-pointer hover:bg-accent"
                                            onClick={() => {
                                              handleAddQuestion(slot.roundId, q.id, slot.questionIndex);
                                            }}
                                          >
                                            <div className="font-medium">{q.title}</div>
                                            <div className="flex gap-2 mt-2">
                                              <Badge variant="outline">{q.topic}</Badge>
                                              <Badge>Уровень {q.difficulty}</Badge>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </ScrollArea>
                                </div>
                              </SheetContent>
                            </Sheet>
                          </div>
                        </form>
                      </Form>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground">
              В этом пакете нет раундов или слотов для вопросов
            </div>
          )}
        </div>
      </div>
    </div>
  );
}