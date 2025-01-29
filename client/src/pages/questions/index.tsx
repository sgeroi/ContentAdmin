import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQuestions } from "@/hooks/use-questions";
import { Link, useLocation } from "wouter";
import { Edit, Trash2, Plus, CheckCircle2, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const difficultyColors: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-lime-500",
  3: "bg-yellow-500",
  4: "bg-orange-500",
  5: "bg-red-500",
};

function getContentPreview(content: any): string {
  try {
    if (content?.content?.[0]?.content?.[0]?.text) {
      return content.content[0].content[0].text.slice(0, 15) + '...';
    }
    return 'Нет содержания';
  } catch (error) {
    return 'Ошибка контента';
  }
}

export default function Questions() {
  const { questions, deleteQuestion, isLoading } = useQuestions();
  const [, setLocation] = useLocation();

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    await deleteQuestion(id);
  };

  const handleRowClick = (id: number) => {
    setLocation(`/questions/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Вопросы</h1>
          <p className="text-muted-foreground">
            Управление вопросами для викторины
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/questions/generate">
            <Button variant="outline">
              <Wand2 className="mr-2 h-4 w-4" />
              Сгенерировать вопросы
            </Button>
          </Link>
          <Link href="/questions/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Новый вопрос
            </Button>
          </Link>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Содержание</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Сложность</TableHead>
              <TableHead>Автор</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow 
                key={question.id}
                onClick={() => handleRowClick(question.id)}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  "focus:bg-muted/50 focus:outline-none"
                )}
              >
                <TableCell>{getContentPreview(question.content)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{question.topic}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={difficultyColors[question.difficulty]}
                  >
                    Уровень {question.difficulty}
                  </Badge>
                </TableCell>
                <TableCell>{question.author?.username}</TableCell>
                <TableCell>
                  {question.factChecked && (
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs">Проверен</span>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/questions/${question.id}`);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Удалить вопрос
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить этот вопрос? Это действие нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                            Отмена
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => handleDelete(question.id, e)}
                          >
                            Удалить
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {questions.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6} 
                  className="text-center text-muted-foreground h-24"
                >
                  {isLoading ? "Загрузка..." : "Вопросы не найдены"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}