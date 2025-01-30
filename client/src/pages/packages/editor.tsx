import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Edit, Plus, X } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { Package, Question, Round } from "@db/schema";

type PackageQuestion = Question & {
  author: { username: string };
};

type RoundWithQuestions = Round & {
  questions: PackageQuestion[];
};

type PackageWithRounds = Package & {
  rounds: RoundWithQuestions[];
};

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const fetchPackage = async () => {
      try {
        const response = await fetch(`/api/packages/${params.id}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch package data');
        }

        const data = await response.json();
        setPackageData(data);
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPackage();
  }, [params.id]);

  const fetchAvailableQuestions = async () => {
    try {
      const response = await fetch('/api/questions', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const data = await response.json();
      setAvailableQuestions(data.questions);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/packages">
            <Button variant="ghost" className="mb-4">
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

      <div className="space-y-6">
        {packageData.rounds.map((round, roundIndex) => (
          <Card key={round.id}>
            <CardHeader>
              <CardTitle>
                Раунд {roundIndex + 1}: {round.name}
              </CardTitle>
              {round.description && (
                <CardDescription>{round.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] rounded-md border">
                <div className="space-y-4 p-4">
                  {Array.from({ length: round.questionCount }).map((_, index) => {
                    const question = round.questions[index];
                    return (
                      <div
                        key={index}
                        className="rounded-lg border p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            {question ? (
                              <div className="space-y-1">
                                <div className="font-medium">
                                  {question.title}
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline">{question.topic}</Badge>
                                  <Badge>
                                    Уровень {question.difficulty}
                                  </Badge>
                                  {question.isGenerated && (
                                    <Badge variant="secondary">AI</Badge>
                                  )}
                                  {question.factChecked && (
                                    <Badge variant="secondary">Проверено</Badge>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Автор: {question.author.username}
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">
                                Пустой слот для вопроса
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {question ? (
                              <>
                                <Link href={`/questions/${question.id}`}>
                                  <Button variant="ghost" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveQuestion(round.id, question.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setSelectedQuestionId(null);
                                      setShowQuestionSelector(true);
                                      fetchAvailableQuestions();
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Выбрать вопрос</DialogTitle>
                                    <DialogDescription>
                                      Выберите существующий вопрос или создайте новый
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <Link href="/questions/new">
                                      <Button className="w-full">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Создать новый вопрос
                                      </Button>
                                    </Link>
                                    <ScrollArea className="h-[400px] rounded-md border">
                                      <div className="space-y-2 p-4">
                                        {availableQuestions.map((q) => (
                                          <div
                                            key={q.id}
                                            className="flex items-center justify-between rounded-lg border p-2"
                                          >
                                            <div>
                                              <div className="font-medium">{q.title}</div>
                                              <div className="text-sm text-muted-foreground">
                                                {q.topic}
                                              </div>
                                            </div>
                                            <Button
                                              variant="ghost"
                                              onClick={() => {
                                                handleAddQuestion(round.id, q.id, index);
                                                setShowQuestionSelector(false);
                                              }}
                                            >
                                              Выбрать
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    </ScrollArea>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
