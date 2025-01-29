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
import { Link } from "wouter";
import { Edit, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const difficultyColors: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-lime-500",
  3: "bg-yellow-500",
  4: "bg-orange-500",
  5: "bg-red-500",
};

// Helper function to get preview text from content
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

  const handleDelete = async (id: number) => {
    await deleteQuestion(id);
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
        <Link href="/questions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новый вопрос
          </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Содержание</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead>Сложность</TableHead>
              <TableHead>Автор</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
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
                  <div className="flex gap-2">
                    <Link href={`/questions/${question.id}`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
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
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(question.id)}
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
                  colSpan={5}
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