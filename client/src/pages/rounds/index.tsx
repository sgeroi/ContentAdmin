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
import { useRounds } from "@/hooks/use-rounds";

export default function Rounds() {
  const { rounds, createRound, updateRound, deleteRound, isLoading } = useRounds();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<{
    id: number;
    name: string;
    description: string;
    difficulty: number;
    timeLimit: number;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    difficulty: "1",
    timeLimit: "60",
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    try {
      if (editingRound) {
        await updateRound({
          id: editingRound.id,
          name: formData.name,
          description: formData.description,
          difficulty: parseInt(formData.difficulty),
          timeLimit: parseInt(formData.timeLimit),
        });
      } else {
        await createRound({
          name: formData.name,
          description: formData.description,
          difficulty: parseInt(formData.difficulty),
          timeLimit: parseInt(formData.timeLimit),
        });
      }
      setIsDialogOpen(false);
      setEditingRound(null);
      setFormData({
        name: "",
        description: "",
        difficulty: "1",
        timeLimit: "60",
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleEdit = (round: typeof editingRound) => {
    if (!round) return;
    setEditingRound(round);
    setFormData({
      name: round.name,
      description: round.description,
      difficulty: round.difficulty.toString(),
      timeLimit: round.timeLimit.toString(),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    await deleteRound(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Раунды</h1>
          <p className="text-muted-foreground">
            Управление раундами викторины
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Новый раунд
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRound ? "Редактировать раунд" : "Создать новый раунд"}
              </DialogTitle>
              <DialogDescription>
                {editingRound
                  ? "Измените параметры существующего раунда"
                  : "Создайте новый раунд для викторины"}
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
                  placeholder="Введите название раунда"
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
                  placeholder="Введите описание раунда"
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
              <Button onClick={handleSubmit} className="w-full">
                {editingRound ? "Сохранить изменения" : "Создать раунд"}
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
              <TableHead className="w-[100px]">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.map((round) => (
              <TableRow key={round.id}>
                <TableCell>{round.name}</TableCell>
                <TableCell>{round.description}</TableCell>
                <TableCell>Уровень {round.difficulty}</TableCell>
                <TableCell>{round.timeLimit} сек</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(round)}
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
                          <AlertDialogTitle>Удалить раунд</AlertDialogTitle>
                          <AlertDialogDescription>
                            Вы уверены, что хотите удалить этот раунд? Это действие
                            нельзя отменить.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(round.id)}
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
            {rounds.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground h-24"
                >
                  {isLoading ? "Загрузка..." : "Раунды не найдены"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}