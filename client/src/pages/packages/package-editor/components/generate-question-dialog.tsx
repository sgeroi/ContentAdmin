import { Form, useForm } from "react-hook-form";
// ui
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// ----------------------------------------------------------------------

interface GenerateQuestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { prompt: string; count: number }) => Promise<void>;
}

export function GenerateQuestionsDialog({
  open,
  onOpenChange,
  onSubmit,
}: GenerateQuestionsDialogProps) {
  const form = useForm<{ prompt: string; count: number }>({
    defaultValues: {
      prompt: "",
      count: 1,
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Сгенерировать вопросы</DialogTitle>
          <DialogDescription>
            Опишите тему и укажите количество вопросов для генерации
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тема или описание</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Например: Вопросы про историю России 19 века, сложность средняя"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="count"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Количество вопросов</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={10} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit">Генерировать</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
