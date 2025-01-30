import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useTemplates } from "@/hooks/use-templates";
import { useRounds } from "@/hooks/use-rounds";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Templates() {
  const { templates, createTemplate, updateRoundSettings, addRound, removeRound, deleteTemplate, isLoading } =
    useTemplates();
  const { rounds } = useRounds();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRoundDialogOpen, setIsRoundDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{
    id: number;
    name: string;
    description: string;
  } | null>(null);
  const [selectedRound, setSelectedRound] = useState<{
    templateId: number;
    roundId: number;
    name: string;
    description: string;
    questionCount: number;
    editorNotes: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [roundFormData, setRoundFormData] = useState({
    name: "",
    description: "",
    questionCount: 0,
    editorNotes: "",
  });

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    try {
      await createTemplate(formData);
      setIsCreateDialogOpen(false);
      setFormData({ name: "", description: "" });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handleRoundSettingsUpdate = async () => {
    if (!selectedRound) return;

    try {
      await updateRoundSettings({
        templateId: selectedRound.templateId,
        roundId: selectedRound.roundId,
        ...roundFormData,
        orderIndex: 0, // TODO: Implement proper ordering
      });
      setIsRoundDialogOpen(false);
      setSelectedRound(null);
      setRoundFormData({
        name: "",
        description: "",
        questionCount: 0,
        editorNotes: "",
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Шаблоны</h1>
          <p className="text-muted-foreground">
            Управление шаблонами игр
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Новый шаблон
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Создать новый шаблон</DialogTitle>
              <DialogDescription>
                Создайте базовый шаблон игры. После создания вы сможете добавить раунды.
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
                <Textarea
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
              <Button onClick={handleCreate} className="w-full">
                Создать шаблон
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              <CardTitle>{template.name}</CardTitle>
              {template.description && (
                <CardDescription>{template.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Раунды</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setIsRoundDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Добавить раунд
                  </Button>
                </div>
                <div className="space-y-2">
                  {template.roundSettings?.map((setting) => (
                    <div
                      key={setting.id}
                      className="flex items-center justify-between gap-2 rounded-lg border p-2"
                    >
                      <div>
                        <div className="font-medium">
                          {setting.name || rounds.find(r => r.id === setting.roundId)?.name}
                        </div>
                        {setting.description && (
                          <div className="text-sm text-muted-foreground">
                            {setting.description}
                          </div>
                        )}
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary">
                            {setting.questionCount} вопросов
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedRound({
                              templateId: template.id,
                              roundId: setting.roundId,
                              name: setting.name || "",
                              description: setting.description || "",
                              questionCount: setting.questionCount || 0,
                              editorNotes: setting.editorNotes || "",
                            });
                            setRoundFormData({
                              name: setting.name || "",
                              description: setting.description || "",
                              questionCount: setting.questionCount || 0,
                              editorNotes: setting.editorNotes || "",
                            });
                            setIsRoundDialogOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
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
                                Вы уверены, что хотите удалить этот раунд из шаблона? Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  removeRound({
                                    templateId: template.id,
                                    roundId: setting.roundId,
                                  })
                                }
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Удалить шаблон
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить шаблон</AlertDialogTitle>
                    <AlertDialogDescription>
                      Вы уверены, что хотите удалить этот шаблон? Это действие нельзя отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteTemplate(template.id)}
                    >
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Нет шаблонов</CardTitle>
              <CardDescription>
                {isLoading
                  ? "Загрузка..."
                  : "Создайте свой первый шаблон, чтобы начать работу"}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <Dialog open={isRoundDialogOpen} onOpenChange={setIsRoundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedRound ? "Настройки раунда" : "Добавить раунд"}
            </DialogTitle>
            <DialogDescription>
              {selectedRound
                ? "Измените настройки раунда для этого шаблона"
                : "Выберите раунд и настройте его параметры"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!selectedRound && (
              <div className="space-y-2">
                <Label>Выберите раунд</Label>
                <div className="grid grid-cols-2 gap-2">
                  {rounds.map((round) => (
                    <Button
                      key={round.id}
                      variant="outline"
                      className="justify-start"
                      onClick={() => {
                        if (!selectedTemplate) return;
                        addRound({
                          templateId: selectedTemplate.id,
                          roundId: round.id,
                        });
                        setIsRoundDialogOpen(false);
                      }}
                    >
                      {round.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {selectedRound && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="roundName">Название (опционально)</Label>
                  <Input
                    id="roundName"
                    value={roundFormData.name}
                    onChange={(e) =>
                      setRoundFormData((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Оставьте пустым, чтобы использовать название раунда"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roundDescription">Описание (опционально)</Label>
                  <Textarea
                    id="roundDescription"
                    value={roundFormData.description}
                    onChange={(e) =>
                      setRoundFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Оставьте пустым, чтобы использовать описание раунда"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="questionCount">Количество вопросов</Label>
                  <Input
                    id="questionCount"
                    type="number"
                    min={1}
                    value={roundFormData.questionCount}
                    onChange={(e) =>
                      setRoundFormData((prev) => ({
                        ...prev,
                        questionCount: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editorNotes">Пометки для редактора</Label>
                  <Textarea
                    id="editorNotes"
                    value={roundFormData.editorNotes}
                    onChange={(e) =>
                      setRoundFormData((prev) => ({
                        ...prev,
                        editorNotes: e.target.value,
                      }))
                    }
                    placeholder="Например: подобрать вопросы про искусство XX века"
                  />
                </div>
                <Button onClick={handleRoundSettingsUpdate} className="w-full">
                  Сохранить настройки
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}