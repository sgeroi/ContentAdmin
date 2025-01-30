import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface QuestionGeneratorDialogProps {
  onSuccess?: () => void;
}

export function QuestionGeneratorDialog({ onSuccess }: QuestionGeneratorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          count,
          prompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Ошибка при генерации вопросов");
      }

      const questions = await response.json();
      toast({
        title: "Успех",
        description: `Сгенерировано ${questions.length} вопросов`,
      });

      // Refresh questions list
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      
      setOpen(false);
      onSuccess?.();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Сгенерировать вопросы
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Генерация вопросов с помощью ИИ</DialogTitle>
          <DialogDescription>
            Укажите параметры для генерации вопросов. Можно использовать промпт для уточнения темы и стиля вопросов.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Промпт для генерации</Label>
            <Textarea
              id="prompt"
              placeholder="Например: Сгенерируй сложные вопросы по истории России 20 века"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="count">Количество вопросов</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={50}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              "Сгенерировать"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
