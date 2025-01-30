import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, X } from "lucide-react";
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
    fetchAvailableQuestions();
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

  const difficultyColors: Record<number, string> = {
    1: "bg-green-500",
    2: "bg-lime-500",
    3: "bg-yellow-500",
    4: "bg-orange-500",
    5: "bg-red-500",
  };

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

      <div className="space-y-8">
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
              <div className="space-y-4">
                {Array.from({ length: round.questionCount }).map((_, index) => {
                  const question = round.questions[index];
                  return (
                    <div
                      key={index}
                      className="rounded-lg border p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold mb-2">
                            Вопрос {index + 1}
                          </h3>
                          {question ? (
                            <div className="space-y-2">
                              <div className="font-medium">
                                {question.title}
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline">{question.topic}</Badge>
                                <Badge className={difficultyColors[question.difficulty]}>
                                  Уровень {question.difficulty}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Автор: {question.author.username}
                              </div>
                              <div className="flex gap-2 mt-4">
                                <Link href={`/questions/${question.id}`}>
                                  <Button variant="outline" size="sm">
                                    Редактировать вопрос
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
                            <div>
                              <div className="text-muted-foreground mb-4">
                                Выберите существующий вопрос или создайте новый
                              </div>
                              <div className="flex gap-2">
                                <select
                                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleAddQuestion(round.id, parseInt(e.target.value), index);
                                    }
                                  }}
                                  value=""
                                >
                                  <option value="">Выберите вопрос из базы</option>
                                  {availableQuestions.map((q) => (
                                    <option key={q.id} value={q.id}>
                                      {q.title} ({q.topic}, Уровень {q.difficulty})
                                    </option>
                                  ))}
                                </select>
                                <Link href="/questions/new">
                                  <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Создать новый
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}