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
import { Edit, Trash2, Plus, CheckCircle2, Wand2, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

const difficultyColors: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-lime-500",
  3: "bg-yellow-500",
  4: "bg-orange-500",
  5: "bg-red-500",
};

function getContentPreview(content: any): string {
  try {
    let preview = '';
    if (content?.content) {
      content.content.forEach((node: any) => {
        if (node.content?.[0]?.text) {
          preview += (preview ? ' | ' : '') + node.content[0].text;
        }
      });
      return preview.slice(0, 50) + '...';
    }
    return 'Нет содержания';
  } catch (error) {
    return 'Ошибка контента';
  }
}

export default function Questions() {
  const [currentPage, setCurrentPage] = useState(1);
  const { questions, total, limit, deleteQuestion, isLoading } = useQuestions(currentPage);
  const [, setLocation] = useLocation();

  const totalPages = Math.ceil(total / limit);

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
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {question.isGenerated && (
                        <Sparkles className="h-4 w-4 text-purple-500" aria-label="Generated by AI" />
                      )}
                      {getContentPreview(question.content)}
                    </div>
                    {question.questionTags && question.questionTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {question.questionTags.map(qt => (
                          <Badge key={qt.tag.id} variant="outline" className="text-xs">
                            {qt.tag.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
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

      {total > 0 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm text-muted-foreground">
            Страница {currentPage} из {totalPages}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}