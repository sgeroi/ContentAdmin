import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, ChevronRight, Search, Edit2, Pencil, Sparkles } from "lucide-react";
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
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  form: any;
  packageData: PackageWithRounds;
}

function NavigationItem({
  round,
  activeQuestionId,
  onQuestionClick,
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
          <span>Раунд {round.orderIndex + 1}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{round.questions.length} / {round.questionCount}</Badge>
        </div>
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

function AutoSaveStatus({ saving }: { saving: boolean }) {
  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 text-sm text-muted-foreground">
      <div className={cn(
        "h-2 w-2 rounded-full transition-colors",
        saving ? "bg-yellow-500" : "bg-green-500"
      )} />
      {saving ? "Сохранение..." : "Все изменения сохранены"}
    </div>
  );
}

function RoundHeader({
  round,
  onSave,
}: {
  round: Round;
  onSave: (id: number, data: { name: string; description: string }) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(round.name);
  const [description, setDescription] = useState(round.description);

  useEffect(() => {
    setName(round.name);
    setDescription(round.description);
  }, [round]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave(round.id, { 
        name: name || "Новый раунд", 
        description: description || "Описание раунда" 
      });
      setEditMode(false);
    } catch (error) {
      // Ошибка будет обработана в родительском компоненте
      console.error("Failed to save round:", error);
    }
  };

  return (
    <div className="sticky top-0 bg-background z-10 py-2 -mx-6 px-6 border-b">
      {editMode ? (
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название раунда"
            />
          </div>
          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание раунда"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setEditMode(false);
                setName(round.name);
                setDescription(round.description);
              }}
            >
              Отмена
            </Button>
            <Button type="submit">
              Сохранить
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-lg font-semibold">
              Раунд {round.orderIndex + 1}: {round.name}
            </h2>
            <p className="text-sm text-muted-foreground">{round.description}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setEditMode(true)}>
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AddQuestionDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: "manual" | "search" | "generate") => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить вопрос</DialogTitle>
          <DialogDescription>
            Выберите способ добавления вопроса
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSelect("manual")}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Написать вручную
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSelect("search")}
          >
            <Search className="mr-2 h-4 w-4" />
            Выбрать из базы
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSelect("generate")}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Сгенерировать с помощью AI
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoundId, setCurrentRoundId] = useState<number | null>(null);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
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
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const packageResponse = await fetch(`/api/packages/${params.id}`, {
          credentials: "include",
        });
        if (!packageResponse.ok) {
          throw new Error("Failed to fetch package data");
        }
        const packageResult = await packageResponse.json();
        setPackageData(packageResult);

        await fetchQuestions();
      } catch (error: any) {
        console.error("Error fetching data:", error);
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

  const handleUpdateRound = useCallback(async (id: number, data: { name: string; description: string }) => {
    setIsSaving(true);
    try {
      console.log('Updating round:', id, data);

      const response = await fetch(`/api/rounds/${id}`, {
        method: "PUT",  // Изменяем на PUT для соответствия серверному роуту
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description
        }),
      });

      console.log('Update response status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error(`Invalid server response: ${responseText}`);
      }

      if (!response.ok) {
        throw new Error(responseData?.error || `Failed to update round: ${response.statusText}`);
      }

      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!updatedResponse.ok) {
        throw new Error("Failed to fetch updated package data");
      }

      const updatedText = await updatedResponse.text();
      console.log('Raw updated package response:', updatedText);

      let updatedData;
      try {
        updatedData = JSON.parse(updatedText);
        console.log('Parsed package data:', updatedData);
      } catch (e) {
        console.error('Failed to parse updated package data:', e);
        throw new Error(`Invalid package response: ${updatedText}`);
      }

      setPackageData(updatedData);
      toast({
        title: "Успех",
        description: "Раунд обновлен",
      });
    } catch (error: any) {
      console.error('Error updating round:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [params.id, toast]);

  const handleAddRound = async () => {
    try {
      const orderIndex = packageData?.rounds.length || 0;
      console.log('Adding new round with index:', orderIndex);

      const roundData = {
        name: "Новый раунд",
        description: "Описание раунда",
        questionCount: 5,
        orderIndex,
      };

      const response = await fetch(`/api/packages/${params.id}/rounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(roundData),
      });

      const responseData = await response.json();
      console.log('New round response:', responseData);

      if (!response.ok) {
        throw new Error(`Failed to add round: ${response.statusText}`);
      }

      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: "include",
      });

      if (!updatedResponse.ok) {
        throw new Error("Failed to fetch updated package data");
      }

      const updatedPackage = await updatedResponse.json();
      console.log('Updated package after adding round:', updatedPackage);
      setPackageData(updatedPackage);

      toast({
        title: "Успех",
        description: "Раунд добавлен",
      });
    } catch (error: any) {
      console.error('Error adding round:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAutoSave = useCallback(
    debounce(async (questionId: number, data: Partial<QuestionFormData>) => {
      setIsSaving(true);
      try {
        console.log('Auto-saving question:', questionId, data);

        const response = await fetch(`/api/questions/${questionId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        });

        let responseData;
        try {
          responseData = await response.json();
          console.log('Save question response:', responseData);
        } catch (e) {
          console.error('Failed to parse response:', e);
          throw new Error('Invalid server response');
        }

        if (!response.ok) {
          throw new Error(responseData?.message || `Failed to save question: ${response.statusText}`);
        }

        const updatedResponse = await fetch(`/api/packages/${params.id}`, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
          },
        });

        if (!updatedResponse.ok) {
          throw new Error("Failed to fetch updated package data");
        }

        let updatedData;
        try {
          updatedData = await updatedResponse.json();
          console.log('Updated package data:', updatedData);
        } catch (e) {
          console.error('Failed to parse updated package data:', e);
          throw new Error('Invalid server response for package data');
        }

        setPackageData(updatedData);
      } catch (error: any) {
        console.error('Error auto-saving:', error);
        toast({
          title: "Ошибка автосохранения",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [params.id, toast]
  );

  const handleAddQuestion = async (roundId: number, questionId: number, position: number) => {
    try {
      const response = await fetch(`/api/rounds/${roundId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          questionId,
          orderIndex: position,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add question to round");
      }

      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: "include",
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
      console.error("Error adding question:", error);
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

  const fetchQuestions = async (filters: QuestionSearchFilters = { query: "" }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.query) queryParams.append("q", filters.query);

      const response = await fetch(`/api/questions?${queryParams}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch questions");
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

  const handleAddQuestionSelect = (type: "manual" | "search" | "generate") => {
    setIsAddQuestionDialogOpen(false);
    switch (type) {
      case "manual":
        // TODO: Добавить создание нового вопроса
        break;
      case "search":
        setIsSearchDialogOpen(true);
        break;
      case "generate":
        // TODO: Добавить генерацию вопроса
        break;
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

      <AutoSaveStatus saving={isSaving} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="h-full border-r flex flex-col container">
            <ScrollArea className="flex-1">
              <div className="space-y-4 py-4">
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
            <div className="py-4 border-t">
              <Button className="w-full" onClick={handleAddRound}>
                <Plus className="h-4 w-4 mr-2" />
                Добавить раунд
              </Button>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>
          <ScrollArea className="h-full">
            <div className="container py-6 space-y-8 pl-12 pr-16">
              {packageData.rounds.map((round) => (
                <div key={round.id} id={`round-${round.id}`} className="space-y-4">
                  <RoundHeader round={round} onSave={handleUpdateRound} />
                  <div className="space-y-4">
                    {round.questions?.map((question, index) => (
                      <div
                        key={`${round.id}-${question.id}`}
                        ref={(el) => (questionRefs.current[`${round.id}-${question.id}`] = el)}
                        className={cn(
                          "rounded-lg border bg-card p-4",
                          activeQuestionId === `${round.id}-${question.id}` && "ring-2 ring-primary"
                        )}
                      >
                        <QuestionItem
                          question={question}
                          index={index}
                          roundId={round.id}
                          roundQuestionCount={round.questionCount}
                          handleAutoSave={handleAutoSave}
                          form={form}
                          packageData={packageData}
                        />
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setCurrentRoundId(round.id);
                        setIsAddQuestionDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить вопрос
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить вопрос</DialogTitle>
            <DialogDescription>
              Найдите существующий вопрос для добавления в раунд
            </DialogDescription>
          </DialogHeader>
          <Form {...searchForm}>
            <form onSubmit={searchForm.handleSubmit(handleSearch)} className="space-y-4">
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
                  onClick={() => {
                    if (currentRoundId) {
                      const round = packageData.rounds.find((r) => r.id === currentRoundId);
                      if (round) {
                        handleAddQuestion(currentRoundId, question.id, round.questions.length);
                      }
                    }
                  }}
                >
                  <div>{getContentPreview(question.content)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Автор: {question.author.username} •
                    Создан: {new Date(question.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      <AddQuestionDialog
        open={isAddQuestionDialogOpen}
        onOpenChange={setIsAddQuestionDialogOpen}
        onSelect={handleAddQuestionSelect}
      />
    </div>
  );
}

function QuestionItem({
  question,
  index,
  roundId,
  roundQuestionCount,
  handleAutoSave,
  form,
  packageData,
}: QuestionItemProps) {
  return (
    <div className="space-y-3">
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
  );
}

function getContentPreview(content: any): string {
  try {
    if (content?.content) {
      let preview = "";
      const extractText = (nodes: any[]): string => {
        let text = "";
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
      return preview.length > 50 ? preview.slice(0, 50) + "..." : preview;
    }
    return "Нет содержания";
  } catch (error) {
    console.error("Error parsing content:", error);
    return "Ошибка контента";
  }
}