import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, Database, MoveVertical, GripVertical, ChevronRight, ChevronDown, PencilIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Package, Question, Template } from "@db/schema";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import debounce from "lodash/debounce";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from "@/lib/utils";

// Типы данных
type PackageQuestion = Question & {
  author: { username: string; };
};

type Round = {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  questions: PackageQuestion[];
  orderIndex: number;
};

type PackageWithRounds = Package & {
  rounds: Round[];
};

// TreeItem компонент для левой панели
function TreeItem({
  id,
  depth,
  isFolder,
  isExpanded,
  label,
  questionPreview,
  badge,
  onToggle,
  onClick,
  isActive,
}: {
  id: string;
  depth: number;
  isFolder?: boolean;
  isExpanded?: boolean;
  label: string;
  questionPreview?: string;
  badge?: string;
  onToggle?: () => void;
  onClick?: () => void;
  isActive?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    transition
  } : undefined;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      onToggle?.();
    } else {
      onClick?.();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer select-none",
        isActive && "bg-accent",
        isDragging && "opacity-50",
        !isActive && "hover:bg-accent/50",
      )}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div style={{ paddingLeft: `${depth * 12}px` }} className="flex items-center gap-2 w-full">
        {isFolder ? (
          <>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="text-sm font-medium">{label}</span>
          </>
        ) : (
          <>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm shrink-0">{label}.</span>
              {questionPreview && (
                <span className="text-sm text-muted-foreground truncate">{questionPreview}</span>
              )}
            </div>
          </>
        )}
        {badge && (
          <Badge variant="secondary" className="text-xs ml-auto">
            {badge}
          </Badge>
        )}
      </div>
    </div>
  );
}

// Компонент редактора вопроса
function QuestionEditor({
  question,
  index,
  roundId,
  roundQuestionCount,
  onSave,
  onRemove,
  onMove,
  packageData,
}: {
  question: PackageQuestion;
  index: number;
  roundId: number;
  roundQuestionCount: number;
  onSave: (questionId: number, data: any) => void;
  onRemove: (roundId: number, questionId: number) => void;
  onMove: (fromRoundId: number, toRoundId: number, questionId: number) => void;
  packageData: PackageWithRounds;
}) {
  const form = useForm({
    defaultValues: {
      content: question.content,
      answer: question.answer,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            Вопрос {index + 1}
          </h2>
          {index >= roundQuestionCount && (
            <Badge variant="secondary">Дополнительный вопрос</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onRemove(roundId, question.id)}
          >
            <X className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <MoveVertical className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Переместить вопрос</DialogTitle>
                <DialogDescription>
                  Выберите раунд, в который хотите переместить вопрос
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {packageData.rounds
                  .filter(r => r.id !== roundId)
                  .map((targetRound) => (
                    <Button
                      key={targetRound.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => onMove(roundId, targetRound.id, question.id)}
                    >
                      Раунд {targetRound.orderIndex + 1}: {targetRound.name}
                    </Button>
                  ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-4">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Содержание вопроса</FormLabel>
                <WysiwygEditor
                  content={field.value}
                  onChange={(content) => {
                    field.onChange(content);
                    onSave(question.id, { content });
                  }}
                  className="min-h-[150px]"
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ответ</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      onSave(question.id, { answer: e.target.value });
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}

function getContentPreview(content: any): string {
  try {
    if (content?.content) {
      let preview = '';
      const extractText = (nodes: any[]): string => {
        let text = '';
        for (const node of nodes) {
          if (node.text) {
            text += node.text;
          }
          if (node.content) {
            text += extractText(node.content);
          }
        }
        return text;
      };
      preview = extractText(content.content);
      return preview.length > 30 ? preview.slice(0, 30) + '...' : preview;
    }
    return 'Нет содержания';
  } catch (error) {
    console.error('Error parsing content:', error);
    return 'Ошибка контента';
  }
}

// Основной компонент редактора пакетов
export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // Загрузка данных пакета
  useEffect(() => {
    async function fetchPackageData() {
      try {
        const response = await fetch(`/api/packages/${params.id}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to fetch package data');
        }

        const data = await response.json();
        setPackageData(data);

        // Выбираем первый раунд по умолчанию
        if (data.rounds.length > 0) {
          setSelectedRoundId(data.rounds[0].id);
          setExpandedRounds(new Set([data.rounds[0].id]));
        }
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    fetchPackageData();
  }, [params.id]);

  // Обработчики событий
  const handleToggleRound = (roundId: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(roundId)) {
        next.delete(roundId);
      } else {
        next.add(roundId);
      }
      return next;
    });
  };

  const handleSelectQuestion = (roundId: number, index: number) => {
    setSelectedRoundId(roundId);
    setSelectedQuestionIndex(index);
  };

  const handleAddQuestion = async (roundId: number, questionId: number, position: number) => {
    try {
      const response = await fetch(`/api/rounds/${roundId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ questionId, orderIndex: position }),
      });

      if (!response.ok) throw new Error('Failed to add question');

      // Обновляем данные пакета
      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });

      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveQuestion = debounce(async (questionId: number, data: any) => {
    try {
      const response = await fetch(`/api/questions/${questionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save question');

      toast({
        title: "Успех",
        description: "Изменения сохранены",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  }, 1000);

  const handleRemoveQuestion = async (roundId: number, questionId: number) => {
    try {
      const response = await fetch(`/api/rounds/${roundId}/questions/${questionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to remove question');

      // Обновляем данные пакета
      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });

      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }

      // Сбрасываем выбранный вопрос если он был удален
      if (selectedRoundId === roundId && selectedQuestionIndex !== null) {
        setSelectedQuestionIndex(null);
      }
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMoveQuestion = async (fromRoundId: number, toRoundId: number, questionId: number) => {
    try {
      await handleRemoveQuestion(fromRoundId, questionId);
      await handleAddQuestion(toRoundId, questionId, 0);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Отрисовка интерфейса
  if (!packageData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <Link href="/packages">
            <Button variant="ghost" className="pl-0">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Назад к пакетам
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{packageData.title}</h1>
          {packageData.description && (
            <p className="text-muted-foreground">{packageData.description}</p>
          )}
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="min-h-[800px] rounded-lg border">
        <ResizablePanel defaultSize={25} minSize={15}>
          <ScrollArea className="h-full" ref={leftPanelRef}>
            <div className="p-4 space-y-4">
              <DndContext
                sensors={useSensors(
                  useSensor(PointerSensor),
                  useSensor(KeyboardSensor, {
                    coordinateGetter: sortableKeyboardCoordinates,
                  })
                )}
                collisionDetection={closestCenter}
                onDragEnd={async (event) => {
                  const { active, over } = event;
                  if (!over || active.id === over.id) return;

                  const activeId = active.id.toString();
                  const overId = over.id.toString();

                  // Перемещение раундов
                  if (!activeId.includes('-') && !overId.includes('-')) {
                    const oldIndex = packageData.rounds.findIndex(r => r.id === parseInt(activeId));
                    const newIndex = packageData.rounds.findIndex(r => r.id === parseInt(overId));

                    try {
                      const response = await fetch(`/api/packages/${params.id}/rounds/reorder`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({
                          roundIds: arrayMove(packageData.rounds.map(r => r.id), oldIndex, newIndex),
                        }),
                      });

                      if (!response.ok) throw new Error('Failed to reorder rounds');

                      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
                        credentials: 'include'
                      });

                      if (updatedResponse.ok) {
                        const updatedData = await updatedResponse.json();
                        setPackageData(updatedData);
                      }
                    } catch (error: any) {
                      toast({
                        title: "Ошибка",
                        description: error.message,
                        variant: "destructive",
                      });
                    }
                  }
                  // Перемещение вопросов
                  else if (activeId.includes('-') && overId.includes('-')) {
                    const [activeRoundId, activeIndex] = activeId.split('-');
                    const [overRoundId, overIndex] = overId.split('-');

                    if (activeRoundId === overRoundId) {
                      const round = packageData.rounds.find(r => r.id === parseInt(activeRoundId));
                      if (!round?.questions) return;

                      try {
                        const response = await fetch(`/api/rounds/${activeRoundId}/questions/reorder`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            questionIds: arrayMove(
                              round.questions.map(q => q.id),
                              parseInt(activeIndex),
                              parseInt(overIndex)
                            ),
                          }),
                        });

                        if (!response.ok) throw new Error('Failed to reorder questions');

                        const updatedResponse = await fetch(`/api/packages/${params.id}`, {
                          credentials: 'include'
                        });

                        if (updatedResponse.ok) {
                          const updatedData = await updatedResponse.json();
                          setPackageData(updatedData);
                        }
                      } catch (error: any) {
                        toast({
                          title: "Ошибка",
                          description: error.message,
                          variant: "destructive",
                        });
                      }
                    }
                  }
                }}
              >
                <SortableContext
                  items={[
                    ...packageData.rounds.map(r => r.id.toString()),
                    ...packageData.rounds.flatMap(round =>
                      (round.questions ?? []).map((_, index) => `${round.id}-${index}`)
                    )
                  ]}
                  strategy={verticalListSortingStrategy}
                >
                  {packageData.rounds.map((round) => (
                    <div key={round.id} className="space-y-1">
                      <TreeItem
                        id={round.id.toString()}
                        depth={0}
                        isFolder
                        isExpanded={expandedRounds.has(round.id)}
                        label={`Раунд ${round.orderIndex + 1}: ${round.name}`}
                        onToggle={() => handleToggleRound(round.id)}
                        isActive={selectedRoundId === round.id && selectedQuestionIndex === null}
                      />
                      {expandedRounds.has(round.id) && (
                        <>
                          {[...Array(Math.max(round.questionCount || 0, (round.questions?.length || 0) + 1))].map((_, index) => {
                            const question = round.questions?.[index];
                            return (
                              <TreeItem
                                key={`${round.id}-${index}`}
                                id={`${round.id}-${index}`}
                                depth={1}
                                label={String(index + 1)}
                                questionPreview={question ? getContentPreview(question.content) : undefined}
                                badge={index >= (round.questionCount || 0) ? "Доп" : undefined}
                                isActive={selectedRoundId === round.id && selectedQuestionIndex === index}
                                onClick={() => handleSelectQuestion(round.id, index)}
                              />
                            );
                          })}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start pl-8 text-muted-foreground"
                            onClick={() => {
                              const nextIndex = round.questions?.length || 0;
                              handleSelectQuestion(round.id, nextIndex);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить вопрос
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
              {/* <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-muted-foreground mt-4"
                onClick={() => {
                  // TODO: Implement creating new round
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить раунд
              </Button> */}
            </div>
          </ScrollArea>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={75}>
          <ScrollArea className="h-full" ref={rightPanelRef}>
            <div className="p-6">
              {selectedRoundId !== null && selectedQuestionIndex !== null && (
                <div>
                  {/* Редактор вопроса */}
                  {packageData.rounds
                    .find(r => r.id === selectedRoundId)
                    ?.questions?.[selectedQuestionIndex] && (
                    <QuestionEditor
                      question={packageData.rounds
                        .find(r => r.id === selectedRoundId)!
                        .questions[selectedQuestionIndex]}
                      index={selectedQuestionIndex}
                      roundId={selectedRoundId}
                      roundQuestionCount={packageData.rounds.find(r => r.id === selectedRoundId)!.questionCount}
                      onSave={handleSaveQuestion}
                      onRemove={handleRemoveQuestion}
                      onMove={handleMoveQuestion}
                      packageData={packageData}
                    />
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}