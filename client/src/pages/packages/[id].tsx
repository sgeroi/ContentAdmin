import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Edit, FileText, CalendarIcon } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

type PackageQuestion = {
  id: number;
  content: any;
  topic: string;
  difficulty: number;
  author: { username: string };
  isGenerated: boolean;
  factChecked: boolean;
  answer: string;
};

type PackageWithQuestions = {
  id: number;
  title: string;
  description: string;
  playDate: string | null;
  author: { username: string } | null;
  rounds: Array<{
    id: number;
    name: string;
    description: string;
    questions: PackageQuestion[];
  }>;
};

const difficultyColors: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-lime-500",
  3: "bg-yellow-500",
  4: "bg-orange-500",
  5: "bg-red-500",
};

function ContentRenderer({ content }: { content: any }) {
  try {
    if (!content?.content) {
      return <div>Нет содержания</div>;
    }

    const renderNode = (node: any) => {
      if (node.type === 'image') {
        return (
          <img 
            key={node.attrs?.src} 
            src={node.attrs?.src} 
            alt={node.attrs?.alt || ''} 
            className="max-w-full my-4 rounded-lg"
          />
        );
      }

      if (node.text) {
        return node.text;
      }

      if (node.content) {
        return node.content.map((child: any, index: number) => (
          <span key={index}>{renderNode(child)}</span>
        ));
      }

      return null;
    };

    return (
      <div>
        {content.content.map((node: any, index: number) => (
          <div key={index}>{renderNode(node)}</div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error rendering content:', error);
    return <div>Ошибка отображения контента</div>;
  }
}

export default function PackageView() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithQuestions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!packageData) {
    return <div>Package not found</div>;
  }

  return (
    <div className="space-y-6 p-6">
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
          <div className="flex gap-2 mt-2">
            {packageData.playDate && (
              <Badge variant="secondary">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {format(new Date(packageData.playDate), "PP")}
              </Badge>
            )}
            {packageData.author && (
              <Badge variant="outline">
                Автор: {packageData.author.username}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/packages/${params.id}/edit`}>
            <Button variant="default">
              <Edit className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              toast({
                title: "Скоро",
                description: "Функция скачивания PDF будет доступна в ближайшее время",
              });
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Скачать PDF
          </Button>
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
                  {round.questions.map((question, questionIndex) => (
                    <div
                      key={question.id}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="space-y-4">
                        <div>
                          <div className="font-medium text-lg">
                            Вопрос {questionIndex + 1}
                          </div>
                          <div className="mt-2 whitespace-pre-wrap">
                            <ContentRenderer content={question.content} />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Ответ:</div>
                          <div className="text-muted-foreground">
                            {question.answer}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">{question.topic}</Badge>
                          <Badge className={difficultyColors[question.difficulty]}>
                            Уровень {question.difficulty}
                          </Badge>
                          {question.isGenerated && (
                            <Badge variant="secondary">AI</Badge>
                          )}
                          {question.factChecked && (
                            <Badge variant="secondary">Проверено</Badge>
                          )}
                          <Badge variant="outline">
                            Автор: {question.author.username}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}