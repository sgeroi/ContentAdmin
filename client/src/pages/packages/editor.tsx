import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import type { Package, Question } from "@db/schema";

type PackageQuestion = Question & {
  author: { username: string };
};

type PackageWithQuestions = Package & {
  rounds: Array<{
    id: number;
    name: string;
    description: string;
    questionCount: number;
    questions: PackageQuestion[];
  }>;
};

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch package data
        const packageResponse = await fetch(`/api/packages/${params.id}`, {
          credentials: 'include'
        });
        if (!packageResponse.ok) {
          throw new Error('Failed to fetch package data');
        }
        const packageResult = await packageResponse.json();
        setPackageData(packageResult);

        // Fetch available questions
        const questionsResponse = await fetch('/api/questions', {
          credentials: 'include'
        });
        if (!questionsResponse.ok) {
          throw new Error('Failed to fetch questions');
        }
        const questionsResult = await questionsResponse.json();
        setAvailableQuestions(questionsResult.questions);
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

    fetchData();
  }, [params.id]);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!packageData) {
    return <div>Package not found</div>;
  }

  // Вычисляем общее количество вопросов во всех раундах
  const totalQuestions = packageData.rounds.reduce((total, round) => total + round.questionCount, 0);

  // Создаем массив всех слотов для вопросов
  const questionSlots = packageData.rounds.flatMap((round, roundIndex) => 
    Array.from({ length: round.questionCount }).map((_, questionIndex) => {
      const question = round.questions[questionIndex];
      return {
        roundId: round.id,
        roundName: round.name,
        roundIndex,
        questionIndex,
        question,
        globalIndex: packageData.rounds.slice(0, roundIndex).reduce((sum, r) => sum + r.questionCount, 0) + questionIndex
      };
    })
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/packages" className="inline-block">
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

      <div className="grid gap-4">
        {questionSlots.map((slot) => (
          <div
            key={`${slot.roundId}-${slot.questionIndex}`}
            className="rounded-lg border p-4 bg-card"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-medium">
                    Раунд {slot.roundIndex + 1}: {slot.roundName}
                  </h3>
                  <span className="text-muted-foreground">
                    Вопрос {slot.questionIndex + 1} из {packageData.rounds[slot.roundIndex].questionCount}
                  </span>
                </div>

                {slot.question ? (
                  <div className="space-y-2">
                    <div>
                      <div className="font-medium">{slot.question.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {slot.question.topic}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Link href={`/questions/${slot.question.id}`}>
                        <Button variant="outline" size="sm">
                          Редактировать
                        </Button>
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <select
                        className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddQuestion(slot.roundId, parseInt(e.target.value), slot.questionIndex);
                          }
                        }}
                        value=""
                      >
                        <option value="">Выберите вопрос из базы</option>
                        {availableQuestions.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title} ({q.topic})
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
        ))}
      </div>
    </div>
  );
}