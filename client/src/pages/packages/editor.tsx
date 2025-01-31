import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, X, Database, Plus, ChevronRight, Search, MoveVertical, GripVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Package, Question } from "@db/schema";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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

interface QuestionItemProps {
  question: PackageQuestion;
  index: number;
  roundId: number;
  roundQuestionCount: number;
  handleAutoSave: (questionId: number, data: any) => void;
  handleRemoveQuestion: (roundId: number, questionId: number) => void;
  handleMoveQuestion: (fromRoundId: number, toRoundId: number, questionId: number) => void;
  form: any;
  id: string;
  packageData: PackageWithRounds;
}

function QuestionItem({
  question,
  index,
  roundId,
  roundQuestionCount,
  handleAutoSave,
  handleRemoveQuestion,
  handleMoveQuestion,
  form,
  id,
  packageData,
}: QuestionItemProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-lg border bg-card",
        isDragging && "opacity-50",
      )}
    >
      <div className="absolute left-[-30px] top-3 cursor-move" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="p-3 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium">
            Вопрос {index + 1}
          </h3>
          {index >= roundQuestionCount && (
            <Badge variant="secondary" className="text-xs">Дополнительный</Badge>
          )}
        </div>

        <div className="space-y-3">
          <Form {...form}>
            <form className="space-y-3">
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
      </div>

      <div className="absolute top-3 right-[-40px] flex flex-col gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleRemoveQuestion(roundId, question.id)}
        >
          <X className="h-4 w-4" />
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon">
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
      return preview.length > 50 ? preview.slice(0, 50) + '...' : preview;
    }
    return 'Нет содержания';
  } catch (error) {
    console.error('Error parsing content:', error);
    return 'Ошибка контента';
  }
}

function NavigationItem({ 
  round, 
  activeQuestionId, 
  onQuestionClick 
}: { 
  round: Round; 
  activeQuestionId: string | null;
  onQuestionClick: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 hover:bg-accent rounded px-2">
        <div className="flex items-center gap-2">
          <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
          <span>Раунд {round.orderIndex + 1}: {round.name}</span>
        </div>
        <Badge variant="outline">{round.questions.length} / {round.questionCount}</Badge>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-6 space-y-1">
        {round.questions.map((question, index) => (
          <div
            key={question.id}
            className={cn(
              "py-1 px-2 rounded cursor-pointer text-sm flex items-center gap-2",
              activeQuestionId === `${round.id}-${question.id}` && "bg-accent"
            )}
            onClick={() => onQuestionClick(`${round.id}-${question.id}`)}
          >
            <span className="text-muted-foreground">{index + 1}.</span>
            <span className="truncate">{getContentPreview(question.content)}</span>
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [showNewQuestionForm, setShowNewQuestionForm] = useState<{roundId: number, index: number} | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  const handleQuestionClick = (id: string) => {
    setActiveQuestionId(id);
    const element = questionRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

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

  const handleSearch = useCallback((data: QuestionSearchFilters) => {
    fetchQuestions(data);
  }, []);

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

      setIsSearchDialogOpen(false);

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
      const response = await fetch(`/api/rounds/${fromRoundId}/questions/${questionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove question from round');
      }

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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!event.over || !packageData) return;

    const { active, over } = event;

    if (active.id !== over.id) {
      const [activeRoundId, activeIndex] = active.id.toString().split('-');
      const [overRoundId, overIndex] = over.id.toString().split('-');

      const round = packageData.rounds.find(r => r.id === parseInt(activeRoundId));
      if (!round || !round.questions) return;

      if (activeRoundId === overRoundId) {
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
        const question = round.questions[parseInt(activeIndex)];
        handleMoveQuestion(parseInt(activeRoundId), parseInt(overRoundId), question.id);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Пакет не найден</h2>
          <p className="text-muted-foreground mt-2">Возможно, он был удален или у вас нет к нему доступа</p>
          <Link href="/packages">
            <Button variant="link" className="mt-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Вернуться к списку пакетов
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b">
        <div className="container py-4">
          <div className="space-y-1">
            <Link href="/packages">
              <Button variant="ghost" className="pl-0">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад к пакетам
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{packageData.title}</h1>
            {packageData.description && (
              <p className="text-muted-foreground">{packageData.description}</p>
            )}
          </div>
        </div>
      </div>

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full border-r">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {packageData.rounds.map((round) => (
                  <NavigationItem
                    key={round.id}
                    round={round}
                    activeQuestionId={activeQuestionId}
                    onQuestionClick={handleQuestionClick}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>
          <ScrollArea className="h-full">
            <div className="container py-6 space-y-8">
              {packageData.rounds.map((round) => (
                <div key={round.id} id={`round-${round.id}`} className="space-y-4">
                  <div className="sticky top-0 bg-background z-10 py-2 -mx-6 px-6 border-b">
                    <h2 className="text-lg font-semibold">
                      Раунд {round.orderIndex + 1}: {round.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">{round.description}</p>
                  </div>

                  <div className="space-y-4">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={round.questions?.map((q, index) => `${round.id}-${index}`) || []}
                        strategy={verticalListSortingStrategy}
                      >
                        {round.questions?.map((question, index) => (
                          <div
                            key={`${round.id}-${question.id}`}
                            ref={el => questionRefs.current[`${round.id}-${question.id}`] = el}
                            className={cn(
                              "rounded-lg border bg-card",
                              activeQuestionId === `${round.id}-${question.id}` && "ring-2 ring-primary"
                            )}
                          >
                            <QuestionItem
                              id={`${round.id}-${index}`}
                              question={question}
                              index={index}
                              roundId={round.id}
                              roundQuestionCount={round.questionCount}
                              handleAutoSave={handleAutoSave}
                              handleRemoveQuestion={handleRemoveQuestion}
                              handleMoveQuestion={handleMoveQuestion}
                              form={form}
                              packageData={packageData}
                            />
                          </div>
                        ))}
                      </SortableContext>
                    </DndContext>

                    <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setIsSearchDialogOpen(true)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Добавить вопрос
                        </Button>
                      </DialogTrigger>
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
                                      <Input
                                        placeholder="Поиск по тексту..."
                                        {...field}
                                      />
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
                                onClick={() => {
                                  handleAddQuestion(round.id, question.id, round.questions.length);
                                }}
                              >
                                <div>{getContentPreview(question.content)}</div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  Автор: {question.author?.username} •
                                  Создан: {new Date(question.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}