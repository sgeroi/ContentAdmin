import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, Settings, Save } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { DragHandleDots2Icon } from "@radix-ui/react-icons";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const roundFormSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string(),
  questionCount: z.number().min(1, "Количество вопросов должно быть больше 0"),
});

const templateFormSchema = z.object({
  name: z.string().min(1, "Название обязательно"),
  description: z.string(),
});

interface RoundSetting {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  orderIndex: number;
}

function SortableRoundItem({ round, onQuestionCountChange, onRemove }: {
  round: RoundSetting;
  onQuestionCountChange: (count: number) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: round.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 border rounded-lg"
      {...attributes}
      {...listeners}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="cursor-move"
      >
        <DragHandleDots2Icon className="h-4 w-4" />
      </Button>
      <div className="flex-1">
        <div className="font-medium">{round.name}</div>
        {round.description && (
          <div className="text-sm text-muted-foreground">
            {round.description}
          </div>
        )}
      </div>
      <Input
        type="number"
        min={1}
        value={round.questionCount}
        onChange={(e) => onQuestionCountChange(parseInt(e.target.value) || 1)}
        className="w-24"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function Templates() {
  const { templates, createTemplate, updateTemplate, updateRoundSettings, addRound, removeRound, deleteTemplate, isLoading } =
    useTemplates();
  const { rounds, createRound } = useRounds();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isNewRoundDialogOpen, setIsNewRoundDialogOpen] = useState(false);
  const [selectedRoundSettings, setSelectedRoundSettings] = useState<{
    templateId: number;
    roundId: number;
    name: string;
    description: string;
    questionCount: number;
    editorNotes: string;
  } | null>(null);
  const { toast } = useToast();
  const [selectedRounds, setSelectedRounds] = useState<RoundSetting[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const newRoundForm = useForm<z.infer<typeof roundFormSchema>>({
    resolver: zodResolver(roundFormSchema),
    defaultValues: {
      name: "",
      description: "",
      questionCount: 1,
    },
  });

  const handleCreate = async (values: z.infer<typeof templateFormSchema>) => {
    if (selectedRounds.length === 0) {
      toast({
        title: "Ошибка",
        description: "Выберите хотя бы один раунд",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Starting template creation with values:', values);
      console.log('Selected rounds:', selectedRounds);

      // First create the template
      const template = await (editingTemplate ? updateTemplate({
          id: editingTemplate,
          name: values.name,
          description: values.description || "",
      }) : createTemplate({
        name: values.name,
        description: values.description || "",
      }));


      console.log('Template created:', template);

      // Then add rounds one by one
      for (const roundSetting of selectedRounds) {
        console.log('Adding round:', roundSetting);
        try {
          await addRound({
            templateId: template.id,
            roundId: roundSetting.id,
            name: roundSetting.name || "",
            description: roundSetting.description || "",
            questionCount: roundSetting.questionCount || 1,
            orderIndex: roundSetting.orderIndex || 0,
          });
        } catch (roundError: any) {
          console.error('Error adding round:', roundError);
          throw new Error(`Failed to add round: ${roundError.message}`);
        }
      }

      setIsCreateDialogOpen(false);
      templateForm.reset();
      setSelectedRounds([]);
      setEditingTemplate(null);

      toast({
        title: "Успех",
        description: "Шаблон успешно создан",
      });
    } catch (error: any) {
      console.error('Template creation error:', error);
      const errorMessage = error.message || "Не удалось создать шаблон";
      console.log('Error message:', errorMessage);

      toast({
        title: "Ошибка при создании шаблона",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const onCreateNewRound = async (values: z.infer<typeof roundFormSchema>) => {
    try {
      const newRound = await createRound({
        ...values,
        orderIndex: rounds.length,
      });

      // Добавляем новый раунд в список выбранных с его настройками
      setSelectedRounds([
        ...selectedRounds,
        {
          id: newRound.id,
          name: newRound.name,
          description: newRound.description || "",
          questionCount: values.questionCount,
          orderIndex: selectedRounds.length,
        },
      ]);

      setIsNewRoundDialogOpen(false);
      newRoundForm.reset();

      toast({
        title: "Успех",
        description: "Раунд успешно создан",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSelectedRounds((rounds) => {
        const oldIndex = rounds.findIndex((r) => r.id === active.id);
        const newIndex = rounds.findIndex((r) => r.id === over.id);

        const newRounds = arrayMove(rounds, oldIndex, newIndex);
        return newRounds.map((round, index) => ({
          ...round,
          orderIndex: index,
        }));
      });
    }
  };

  const handleStartEdit = (templateId: number) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    templateForm.reset({
      name: template.name,
      description: template.description || "",
    });
    setSelectedRounds(template.roundSettings?.map(rs => ({
      id: rs.roundId,
      name: rs.name || rounds.find(r => r.id === rs.roundId)?.name || "",
      description: rs.description || "",
      questionCount: rs.questionCount || 1,
      orderIndex: rs.orderIndex || 0,
    })) || []);
    setEditingTemplate(templateId);
  };

  const handleSaveEdit = async () => {
    if (!editingTemplate) return;

    try {
      // Update template details
      await updateTemplate({
        id: editingTemplate,
        name: templateForm.getValues("name"),
        description: templateForm.getValues("description"),
      });

      // Update round settings
      for (const round of selectedRounds) {
        await updateRoundSettings({
          templateId: editingTemplate,
          roundId: round.id,
          name: round.name,
          description: round.description,
          questionCount: round.questionCount,
          orderIndex: round.orderIndex,
        });
      }

      setEditingTemplate(null);
      toast({
        title: "Успех",
        description: "Шаблон успешно обновлен",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
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
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Создать новый шаблон</DialogTitle>
              <DialogDescription>
                Создайте шаблон игры и настройте раунды
              </DialogDescription>
            </DialogHeader>
            <Form {...templateForm}>
              <form onSubmit={templateForm.handleSubmit(handleCreate)} className="space-y-6">
                <FormField
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Название</FormLabel>
                      <FormControl>
                        <Input placeholder="Введите название шаблона" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Описание</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Введите описание шаблона"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Раунды</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsNewRoundDialogOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Создать новый раунд
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={selectedRounds.map(r => r.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {selectedRounds.map((roundSetting, index) => (
                          <SortableRoundItem
                            key={roundSetting.id}
                            round={roundSetting}
                            onQuestionCountChange={(count) => {
                              const newRounds = [...selectedRounds];
                              newRounds[index] = {
                                ...newRounds[index],
                                questionCount: count,
                              };
                              setSelectedRounds(newRounds);
                            }}
                            onRemove={() => {
                              setSelectedRounds(
                                selectedRounds.filter((_, i) => i !== index)
                              );
                            }}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>

                  {rounds
                    .filter(
                      (round) =>
                        !selectedRounds.some(
                          (selected) => selected.id === round.id
                        )
                    )
                    .length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {rounds
                        .filter(
                          (round) =>
                            !selectedRounds.some(
                              (selected) => selected.id === round.id
                            )
                        )
                        .map((round) => (
                          <Button
                            key={round.id}
                            type="button"
                            variant="outline"
                            className="justify-start"
                            onClick={() => {
                              setSelectedRounds([
                                ...selectedRounds,
                                {
                                  id: round.id,
                                  name: round.name,
                                  description: round.description || "",
                                  questionCount: round.questionCount || 1,
                                  orderIndex: selectedRounds.length,
                                },
                              ]);
                            }}
                          >
                            <div className="flex flex-col items-start">
                              <span>{round.name}</span>
                              {round.description && (
                                <span className="text-xs text-muted-foreground">
                                  {round.description}
                                </span>
                              )}
                            </div>
                          </Button>
                        ))}
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  Создать шаблон
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Диалог создания нового раунда */}
      <Dialog open={isNewRoundDialogOpen} onOpenChange={setIsNewRoundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый раунд</DialogTitle>
            <DialogDescription>
              Создайте новый раунд для добавления в шаблон
            </DialogDescription>
          </DialogHeader>
          <Form {...newRoundForm}>
            <form onSubmit={newRoundForm.handleSubmit(onCreateNewRound)} className="space-y-4">
              <FormField
                control={newRoundForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите название раунда" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newRoundForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Введите описание раунда"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={newRoundForm.control}
                name="questionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Количество вопросов</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={e => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Создать раунд
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Список существующих шаблонов */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id}>
            <CardHeader>
              {editingTemplate === template.id ? (
                <div className="space-y-2">
                  <Input
                    value={templateForm.watch("name")}
                    onChange={(e) => templateForm.setValue("name", e.target.value)}
                    placeholder="Название шаблона"
                  />
                  <Textarea
                    value={templateForm.watch("description")}
                    onChange={(e) => templateForm.setValue("description", e.target.value)}
                    placeholder="Описание шаблона"
                  />
                </div>
              ) : (
                <>
                  <CardTitle>{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Раунды</Label>
                  {editingTemplate === template.id && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsNewRoundDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить раунд
                    </Button>
                  )}
                </div>
                {editingTemplate === template.id ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedRounds.map(r => r.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {selectedRounds.map((round, index) => (
                        <SortableRoundItem
                          key={round.id}
                          round={round}
                          onQuestionCountChange={(count) => {
                            const newRounds = [...selectedRounds];
                            newRounds[index] = {
                              ...newRounds[index],
                              questionCount: count,
                            };
                            setSelectedRounds(newRounds);
                          }}
                          onRemove={() => {
                            setSelectedRounds(
                              selectedRounds.filter((_, i) => i !== index)
                            );
                          }}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                ) : (
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {editingTemplate === template.id ? (
                  <>
                    <Button
                      onClick={handleSaveEdit}
                      className="flex-1"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Сохранить
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingTemplate(null)}
                    >
                      Отмена
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStartEdit(template.id)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Редактировать
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
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
                  </>
                )}
              </div>
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
    </div>
  );
}