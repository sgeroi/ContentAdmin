import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getContentPreview } from "@/lib/utils";
import { Search } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Question } from "@db/schema";

// ----------------------------------------------------------------------

interface AddQuestionListDialog {
  open: boolean;
  packageId: number;
  availableQuestions: Question[];
  handleSearch: (data: QuestionSearchFilters) => void;
  onQuestionClick: (questionId: number) => void;
  onOpenChange: (open: boolean) => void;
}

type QuestionSearchFilters = {
  query: string;
};

export function AddQuestionListDialog({
  handleSearch,
  onQuestionClick,
  availableQuestions,
  open,
  onOpenChange,
  packageId,
}: AddQuestionListDialog) {
  const searchForm = useForm<QuestionSearchFilters>({
    defaultValues: {
      query: "",
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить вопрос</DialogTitle>
          <DialogDescription>
            Найдите существующий вопрос для добавления в раунд
          </DialogDescription>
        </DialogHeader>
        <Form {...searchForm}>
          <form
            onSubmit={searchForm.handleSubmit(handleSearch)}
            className="space-y-4"
          >
            <FormField
              control={searchForm.control}
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input placeholder="Поиск по тексту..." {...field} />
                      <Button type="submit">
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          </form>
        </Form>
        <ScrollArea className="h-[400px] mt-4">
          <div className="space-y-2">
            {availableQuestions.map((question) => (
              <div
                key={question.id}
                className="p-3 rounded-lg border cursor-pointer hover:bg-accent"
                onClick={() => onQuestionClick(question.id)}
              >
                <div>{getContentPreview(question.content)}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Автор: {question?.author?.username} • Создан:{" "}
                  {new Date(question.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}