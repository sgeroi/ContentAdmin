import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, Database, Search, MoveVertical, GripVertical, ChevronRight, ChevronDown, PencilIcon, Plus } from "lucide-react";
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
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

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

// Custom hook for DnD sensors
function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}

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

type QuestionFormData = {
  content: any;
  answer: string;
};

type QuestionSearchFilters = {
  query: string;
};

interface TreeItemProps {
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
}

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
}: TreeItemProps) {
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

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.();
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
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <div style={{ paddingLeft: `${depth * 12}px` }} className="flex items-center gap-2 w-full">
        {isFolder ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 p-0"
              onClick={handleToggleClick}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <span className="text-sm font-medium" onClick={handleToggleClick}>{label}</span>
          </>
        ) : (
          <>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm shrink-0" onClick={onClick}>{label}.</span>
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

interface QuestionEditorProps {
  question: PackageQuestion;
  index: number;
  roundId: number;
  roundQuestionCount: number;
  handleAutoSave: (questionId: number, data: any) => void;
  handleRemoveQuestion: (roundId: number, questionId: number) => void;
  handleMoveQuestion: (fromRoundId: number, toRoundId: number, questionId: number) => void;
  form: any;
  packageData: PackageWithRounds;
}

function QuestionEditor({
  question,
  index,
  roundId,
  roundQuestionCount,
  handleAutoSave,
  handleRemoveQuestion,
  handleMoveQuestion,
  form,
  packageData,
}: QuestionEditorProps) {
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
            onClick={() => handleRemoveQuestion(roundId, question.id)}
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
                      onClick={() => handleMoveQuestion(roundId, targetRound.id, question.id)}
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
          <FormItem>
            <FormLabel>Содержание вопроса</FormLabel>
            <WysiwygEditor
              content={question.content}
              onChange={(content) => handleAutoSave(question.id, { content })}
              className="min-h-[150px]"
            />
            <FormMessage />
          </FormItem>
          <FormField
            control={form.control}
            name="answer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ответ</FormLabel>
                <FormControl>
                  <Input
                    defaultValue={question.answer || ""}
                    onChange={(e) => {
                      field.onChange(e);
                      handleAutoSave(question.id, { answer: e.target.value });
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

type EditRoundData = {
  name: string;
  description: string;
  questionCount: number;
};

type CreateRoundData = {
  name: string;
  description: string;
  questionCount: number;
  templateId?: number;
};

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeQuestion, setActiveQuestion] = useState<{ roundId: number; index: number; } | null>(null);
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [showNewQuestionForm, setShowNewQuestionForm] = useState<{roundId: number, index: number} | null>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [isEditRoundDialogOpen, setIsEditRoundDialogOpen] = useState(false);
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [isCreateRoundDialogOpen, setIsCreateRoundDialogOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [createRoundMode, setCreateRoundMode] = useState<"template" | "manual">("template");

  const form = useForm<QuestionFormData>({
    defaultValues: {
      content: {},
      answer: "",
    },
  });

  const searchForm = useForm<QuestionSearchFilters>({
    defaultValues: {
      query: "",
    },
  });

  const editRoundForm = useForm<EditRoundData>();
  const createRoundForm = useForm<CreateRoundData>();

  const sensors = useDndSensors();

  const toggleRound = useCallback((roundId: number) => {
    setExpandedRounds(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(roundId)) {
        newExpanded.delete(roundId);
      } else {
        newExpanded.add(roundId);
      }
      return newExpanded;
    });
  }, []);

  const scrollToQuestion = useCallback((roundId: number, index: number) => {
    const element = document.getElementById(`question-${roundId}-${index}`);
    if (element && rightPanelRef.current) {
      rightPanelRef.current.scrollTo({
        top: element.offsetTop - 20,
        behavior: 'smooth'
      });
    }
  }, []);

  useEffect(() => {
    if (activeQuestion) {
      scrollToQuestion(activeQuestion.roundId, activeQuestion.index);
    }
  }, [activeQuestion, scrollToQuestion]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const packageResponse = await fetch(`/api/packages/${params.id}`, {
          credentials: 'include'
        });
        if (!packageResponse.ok) {
          throw new Error('Failed to fetch package data');
        }
        const packageResult = await packageResponse.json();
        setPackageData(packageResult);

        // Expand the first round by default
        if (packageResult.rounds.length > 0) {
          setExpandedRounds(new Set([packageResult.rounds[0].id]));
          if (packageResult.rounds[0].questions.length > 0) {
            setActiveQuestion({
              roundId: packageResult.rounds[0].id,
              index: 0,
            });
          }
        }

        await fetchQuestions();
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const fetchQuestions = async (filters: QuestionSearchFilters = { query: "" }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.query) queryParams.append("q", filters.query);

      const response = await fetch(`/api/questions?${queryParams}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      const result = await response.json();
      setAvailableQuestions(result.questions);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSearch = (data: QuestionSearchFilters) => {
    debouncedSearch(data);
  };

  const debouncedSearch = useCallback(
    debounce((filters: QuestionSearchFilters) => {
      fetchQuestions(filters);
    }, 300),
    []
  );

  const handleAutoSave = useCallback(
    debounce(async (questionId: number, data: Partial<QuestionFormData>) => {
      try {
        const response = await fetch(`/api/questions/${questionId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to save question');
        }

        toast({
          title: "Сохранено",
          description: "Изменения автоматически сохранены",
        });
      } catch (error: any) {
        toast({
          title: "Ошибка автосохранения",
          description: error.message,
          variant: "destructive",
        });
      }
    }, 1000),
    []
  );

  const handleAddQuestion = async (roundId: number, questionId: number, position: number) => {
    try {
      const response = await fetch(`/api/rounds/${roundId}/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          orderIndex: position,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add question to round');
      }

      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }

      toast({
        title: "Успех",
        description: "Вопрос добавлен в раунд",
      });
    } catch (error: any) {
      console.error('Error adding question:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveQuestion = async (roundId: number, questionId: number) => {
    try {
      const response = await fetch(`/api/rounds/${roundId}/questions/${questionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove question from round');
      }

      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }

      toast({
        title: "Успех",
        description: "Вопрос удален из раунда",
      });
    } catch (error: any) {
      console.error('Error removing question:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMoveQuestion = async (fromRoundId: number, toRoundId: number, questionId: number) => {
    try {
      // Remove from current round first
      await handleRemoveQuestion(fromRoundId, questionId);

      // Then add to new round
      await handleAddQuestion(toRoundId, questionId, 0);

      toast({
        title: "Успех",
        description: "Вопрос перемещен в другой раунд",
      });
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const [activeRoundId, activeIndex] = active.id.toString().split('-');
    const [overRoundId, overIndex] = over.id.toString().split('-');

    if (activeRoundId === overRoundId) {
      const round = packageData?.rounds.find(r => r.id === parseInt(activeRoundId));
      if (!round?.questions) return;

      const oldIndex = parseInt(activeIndex);
      const newIndex = parseInt(overIndex);

      const updatedQuestions = [...round.questions];
      const [movedItem] = updatedQuestions.splice(oldIndex, 1);
      updatedQuestions.splice(newIndex, 0, movedItem);

      try {
        const response = await fetch(`/api/rounds/${activeRoundId}/questions/reorder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            questionIds: updatedQuestions.map(q => q.id),
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to reorder questions');
        }

        const updatedResponse = await fetch(`/api/packages/${params.id}`, {
          credentials: 'include'
        });
        if (updatedResponse.ok) {
          const updatedData = await updatedResponse.json();
          setPackageData(updatedData);
        }

        toast({
          title: "Успех",
          description: "Порядок вопросов обновлен",
        });
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      const round = packageData?.rounds.find(r => r.id === parseInt(activeRoundId));
      if (!round?.questions) return;

      const question = round.questions[parseInt(activeIndex)];
      if (!question) return;

      await handleMoveQuestion(parseInt(activeRoundId), parseInt(overRoundId), question.id);
    }
  };

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch('/api/templates', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };

    fetchTemplates();
  }, []);


  const handleEditRound = (round: Round) => {
    setEditingRound(round);
    editRoundForm.reset({
      name: round.name,
      description: round.description,
      questionCount: round.questionCount,
    });
    setIsEditRoundDialogOpen(true);
  };

  const handleUpdateRound = async (data: EditRoundData) => {
    if (!editingRound) return;

    try {
      const response = await fetch(`/api/rounds/${editingRound.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update round');
      }

      // Update package data
      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }

      toast({
        title: "Успех",
        description: "Раунд обновлен",
      });
      setIsEditRoundDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateRound = async (data: CreateRoundData) => {
    try {
      const response = await fetch(`/api/packages/${params.id}/rounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create round');
      }

      // Update package data
      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include'
      });
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json();
        setPackageData(updatedData);
      }

      toast({
        title: "Успех",
        description: "Новый раунд создан",
      });
      setIsCreateRoundDialogOpen(false);
      createRoundForm.reset();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Find active question data
  const activeQuestionData = activeQuestion
    ? packageData?.rounds.find(r => r.id === activeQuestion.roundId)?.questions[activeQuestion.index]
    : null;
  const activeRound = activeQuestion
    ? packageData?.rounds.find(r => r.id === activeQuestion.roundId)
    : null;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!packageData) {
    return <div>Package not found</div>;
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
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Содержание</div>
                <Button variant="outline" size="sm" onClick={() => setIsCreateRoundDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить раунд
                </Button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={(packageData?.rounds ?? []).flatMap(round =>
                    (round.questions ?? []).map((_, index) => `${round.id}-${index}`)
                  )}
                  strategy={verticalListSortingStrategy}
                >
                  {packageData.rounds.map((round) => (
                    <div key={round.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <TreeItem
                          id={`round-${round.id}`}
                          depth={0}
                          isFolder
                          isExpanded={expandedRounds.has(round.id)}
                          label={`Раунд ${round.orderIndex + 1}: ${round.name}`}
                          onToggle={() => toggleRound(round.id)}
                        />
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEditRound(round)}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              const nextIndex = round.questions?.length || 0;
                              setActiveQuestion({ roundId: round.id, index: nextIndex });
                              scrollToQuestion(round.id, nextIndex);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {expandedRounds.has(round.id) && [...Array(Math.max(round.questionCount || 0, (round.questions?.length || 0) + 1))].map((_, index) => {
                        const question = round.questions?.[index];
                        const isActive = activeQuestion?.roundId === round.id && activeQuestion?.index === index;
                        const questionPreview = question ? getContentPreview(question.content) : undefined;
                        return (
                          <TreeItem
                            key={`${round.id}-${index}`}
                            id={`${round.id}-${index}`}
                            depth={1}
                            label={String(index + 1)}
                            questionPreview={questionPreview}
                            badge={index >= (round.questionCount || 0) ? "Доп" : undefined}
                            isActive={isActive}
                            onClick={() => {
                              setActiveQuestion({ roundId: round.id, index });
                              scrollToQuestion(round.id, index);
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </ScrollArea>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>
          <ScrollArea className="h-full" ref={rightPanelRef}>
            <div className="p-6 space-y-8">
              {packageData?.rounds.map((round) => (
                <div key={round.id} className="space-y-6">
                  <div className="sticky top-0 bg-background z-10 py-2">
                    <h2 className="text-2xl font-bold">
                      Раунд {round.orderIndex + 1}: {round.name}
                    </h2>
                    {round.description && (
                      <p className="text-muted-foreground">{round.description}</p>
                    )}
                  </div>
                  {[...Array(Math.max(round.questionCount || 0, (round.questions?.length || 0) + 1))].map((_, index) => {
                    const question = round.questions?.[index];
                    const isActive = activeQuestion?.roundId === round.id && activeQuestion?.index === index;
                    return (
                      <div
                        key={`${round.id}-${index}`}
                        id={`question-${round.id}-${index}`}
                        className={cn(
                          "p-6 rounded-lg border",
                          isActive && "ring-2 ring-primary"
                        )}
                      >
                        {question ? (
                          <QuestionEditor
                            question={question}
                            index={index}
                            roundId={round.id}
                            roundQuestionCount={round.questionCount || 0}
                            handleAutoSave={handleAutoSave}
                            handleRemoveQuestion={handleRemoveQuestion}
                            handleMoveQuestion={handleMoveQuestion}
                            form={form}
                            packageData={packageData}
                          />
                        ) : (
                          <div className="space-y-6">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h3 className="text-lg font-semibold">
                                  Вопрос {index + 1}
                                </h3>
                                {index >= (round.questionCount || 0) && (
                                  <Badge variant="secondary">Дополнительный вопрос</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-4">
                              <Button
                                onClick={() => setShowNewQuestionForm({
                                  roundId: round.id,
                                  index,
                                })}
                              >
                                Написать вопрос
                              </Button>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline">
                                    <Database className="h-4 w-4 mr-2" />
                                    Выбрать из базы
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Поиск вопросов</DialogTitle>
                                    <DialogDescription>
                                      Найдите вопросы для добавления в раунд
                                    </DialogDescription>
                                  </DialogHeader>
                                  <Form {...searchForm}>
                                    <form
                                      onSubmit={searchForm.handleSubmit(handleSearch)}
                                      className="space-y-3"
                                    >
                                      <div className="flex gap-3">
                                        <FormField
                                          control={searchForm.control}
                                          name="query"
                                          render={({ field }) => (
                                            <FormItem className="flex-1">
                                              <FormControl>
                                                <Input
                                                  placeholder="Поиск по тексту..."
                                                  {...field}
                                                />
                                              </FormControl>
                                            </FormItem>
                                          )}
                                        />
                                        <Button type="submit">
                                          <Search className="h-4 w-4 mr-2" />
                                          Поиск
                                        </Button>
                                      </div>
                                    </form>
                                  </Form>
                                  <ScrollArea className="h-[400px]">
                                    <div className="space-y-3">
                                      {availableQuestions.map((q) => (
                                        <div
                                          key={q.id}
                                          className="p-3 border rounded-lg cursor-pointer hover:bg-accent"
                                          onClick={() => {
                                            handleAddQuestion(activeQuestion!.roundId, q.id, activeQuestion!.index);
                                            setIsSearchDialogOpen(false);
                                          }}
                                        >
                                          <div className="text-sm">
                                            {q.content && typeof q.content === 'object' && 'content' in q.content && Array.isArray(q.content.content) && q.content.content[0]?.content?.[0]?.text || "Нет текста"}
                                          </div>
                                          <div className="text-sm text-muted-foreground mt-2">
                                            Автор: {(q.author as any)?.username} •
                                            Создан: {new Date(q.createdAt).toLocaleDateString()}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </ScrollArea>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={isEditRoundDialogOpen} onOpenChange={setIsEditRoundDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать раунд</DialogTitle>
            <DialogDescription>
              Измените информацию о раунде
            </DialogDescription>
          </DialogHeader>
          <Form {...editRoundForm}>
            <form onSubmit={editRoundForm.handleSubmit(handleUpdateRound)} className="space-y-4">
              <FormField
                control={editRoundForm.control}
                name="name"
                render={({field }) => (
                  <FormItem>
                    <FormLabel>Название</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Введите название раунда" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editRoundForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Описание</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Введите описание раунда" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editRoundForm.control}
                name="questionCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Количество вопросов</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Сохранить</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateRoundDialogOpen} onOpenChange={setIsCreateRoundDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Создать новый раунд</DialogTitle>
            <DialogDescription>
              Создайте новый раунд, выбрав шаблон или заполнив информацию вручную
            </DialogDescription>
          </DialogHeader>
          <Tabs value={createRoundMode} onValueChange={(value) => setCreateRoundMode(value as "template" | "manual")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="template">Использовать шаблон</TabsTrigger>
              <TabsTrigger value="manual">Создать вручную</TabsTrigger>
            </TabsList>
            <Form {...createRoundForm}>
              <form onSubmit={createRoundForm.handleSubmit(handleCreateRound)} className="space-y-4">
                <TabsContent value="template" className="space-y-4">
                  <FormField
                    control={createRoundForm.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Шаблон</FormLabel>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите шаблон" />
                          </SelectTrigger>
                          <SelectContent>
                            {templates.map((template) => (
                              <SelectItem key={template.id} value={template.id.toString()}>
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {templates.find(t => t.id === parseInt(createRoundForm.watch("templateId")))?.roundSettings && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Параметры шаблона:</p>
                      {templates
                        .find(t => t.id === parseInt(createRoundForm.watch("templateId")))
                        ?.roundSettings?.map((round) => (
                          <div key={round.id} className="p-3 border rounded-lg">
                            <div className="font-medium">{round.name}</div>
                            <div className="text-sm text-muted-foreground">{round.description}</div>
                            <Badge variant="secondary">{round.questionCount} вопросов</Badge>
                          </div>
                        ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="manual">
                  <div className="space-y-4">
                    <FormField
                      control={createRoundForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Название</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Введите название раунда" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createRoundForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Описание</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Введите описание раунда" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createRoundForm.control}
                      name="questionCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Количество вопросов</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                <DialogFooter>
                  <Button type="submit">Создать раунд</Button>
                </DialogFooter>
              </form>
            </Form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}