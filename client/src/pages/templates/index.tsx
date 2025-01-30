import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTemplates } from "@/hooks/use-templates";
import { Badge } from "@/components/ui/badge";
import { useRounds } from "@/hooks/use-rounds";

export default function Templates() {
  const { templates, createTemplate, updateTemplate, deleteTemplate, isLoading } =
    useTemplates();
  const { rounds } = useRounds();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<{
    id: number;
    name: string;
    description: string;
    difficulty: number;
    timeLimit: number;
    rounds: number[];
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    difficulty: "1",
    timeLimit: "60",
    rounds: [] as string[],
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      const templateData = {
        name: formData.name,
        description: formData.description,
        difficulty: parseInt(formData.difficulty),
        timeLimit: parseInt(formData.timeLimit),
        rounds: formData.rounds.map(Number),
      };

      if (editingTemplate) {
        await updateTemplate({
          id: editingTemplate.id,
          ...templateData,
        });
      } else {
        await createTemplate(templateData);
      }
      setIsDialogOpen(false);
      setEditingTemplate(null);
      setFormData({
        name: "",
        description: "",
        difficulty: "1",
        timeLimit: "60",
        rounds: [],
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (template: typeof editingTemplate) => {
    if (!template) return;
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      difficulty: template.difficulty.toString(),
      timeLimit: template.timeLimit.toString(),
      rounds: template.rounds.map(String),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteTemplate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Шаблоны</h1>
          <p className="text-muted-foreground">
            Управление шаблонами пакетов
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Новый шаблон
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate ? "Редактировать шаблон" : "Создать новый шаблон"}
              </DialogTitle>
              <DialogDescription>
                {editingTemplate
                  ? "Измените параметры существующего шаблона"
                  : "Создайте новый шаблон пакета"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Введите название шаблона"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Введите описание шаблона"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Сложность</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите сложность" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((level) => (
                        <SelectItem key={level} value={level.toString()}>
                          Уровень {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Время (секунд)</Label>
                  <Input
                    id="timeLimit"
                    type="number"
                    min="30"
                    max="300"
                    value={formData.timeLimit}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        timeLimit: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Раунды</Label>
                <div className="flex flex-wrap gap-2">
                  {rounds.map((round) => (
                    <Badge
                      key={round.id}
                      variant={
                        formData.rounds.includes(round.id.toString())
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => {
                        const roundId = round.id.toString();
                        const newRounds = formData.rounds.includes(roundId)
                          ? formData.rounds.filter((id) => id !== roundId)
                          : [...formData.rounds, roundId];
                        setFormData((prev) => ({ ...prev, rounds: newRounds }));
                      }}
                    >
                      {round.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTemplate ? "Сохранить изменения" : "Создать шаблон"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Название</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Сложность</TableHead>
              <TableHead>Время</TableHead>
              <TableHead>Раунды</TableHead>
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((template) => (
              <TableRow key={template.id}>
                <TableCell>{template.name}</TableCell>
                <TableCell>{template.description}</TableCell>
                <TableCell>Уровень {template.difficulty}</TableCell>
                <TableCell>{template.timeLimit} сек</TableCell>
                <TableCell>{template.roundCount} раундов</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Удалить шаблон</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить этот шаблон? Это
                            действие нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(template.id)}
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
            {templates.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center text-muted-foreground h-24"
                >
                  {isLoading ? "Загрузка..." : "Шаблоны не найдены"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}