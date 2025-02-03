import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, Plus, ChevronRight, Search, Edit2, Pencil, Sparkles, Trash2, CalendarIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Package, Question } from "@db/schema";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
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
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useUsers } from "@/hooks/use-users"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuestions } from "@/hooks/use-questions";


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
  handleDelete: (roundId: number, questionId: number) => Promise<void>;
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
        <Droppable droppableId={`round-${round.id}`}>
          {(provided, snapshot) => (
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps}
              className={cn(
                "min-h-[8px] transition-colors rounded-md p-1",
                snapshot.isDraggingOver && "bg-accent/50"
              )}
            >
              {round.questions.map((question, index) => (
                <Draggable 
                  key={question.id} 
                  draggableId={`question-${question.id}`} 
                  index={index}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={cn(
                        "py-1 px-2 rounded cursor-pointer text-sm flex items-center gap-2 transition-colors",
                        activeQuestionId === `${round.id}-${question.id}` && "bg-accent",
                        snapshot.isDragging && "bg-accent/80 shadow-lg"
                      )}
                      onClick={() => onQuestionClick(`${round.id}-${question.id}`)}
                    >
                      <span 
                        {...provided.dragHandleProps}
                        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing select-none px-1 -ml-1"
                        onClick={e => e.stopPropagation()}
                      >
                        ⠿
                      </span>
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span className="truncate flex-1">{getContentPreview(question.content)}</span>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
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
            <Button type="submit">Сохранить</Button>
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


function GenerateQuestionsDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { prompt: string; count: number }) => Promise<void>;
}) {
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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

function QuestionItem({
  question,
  index,
  roundId,
  roundQuestionCount,
  handleAutoSave,
  handleDelete,
  form,
  packageData,
}: QuestionItemProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Вопрос {index + 1} из {roundQuestionCount}</span>
            <Badge variant="outline">{question.author.username}</Badge>
          </div>
          <WysiwygEditor
            content={question.content}
            onChange={(content) => handleAutoSave(question.id, { content })}
            className="min-h-[200px]"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => handleDelete(roundId, question.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <Label>Ответ</Label>
        <Input
          value={question.answer}
          onChange={(e) => handleAutoSave(question.id, { answer: e.target.value })}
        />
      </div>
    </div>
  );
}

function PackageHeader({ 
  packageData,
  onSave,
}: { 
  packageData: PackageWithRounds;
  onSave: (data: Partial<Package>) => Promise<void>;
}) {
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState(packageData.title);
  const [description, setDescription] = useState(packageData.description || "");
  const [playDate, setPlayDate] = useState<Date | undefined>(packageData.playDate ? new Date(packageData.playDate) : undefined);
  const [authorId, setAuthorId] = useState<number>(packageData.authorId);
  const { users } = useUsers();
  const { toast } = useToast();

  useEffect(() => {
    setTitle(packageData.title);
    setDescription(packageData.description || "");
    setPlayDate(packageData.playDate ? new Date(packageData.playDate) : undefined);
    setAuthorId(packageData.authorId);
  }, [packageData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSave({
        title,
        description,
        playDate: playDate ? new Date(playDate).toISOString() : null,
        authorId,
      });
      setEditMode(false);
      toast({
        title: "Успех",
        description: "Пакет обновлен",
      });
    } catch (error: any) {
      console.error('Error saving package:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (editMode) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Название</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название пакета"
          />
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание пакета"
          />
        </div>
        <div className="space-y-2">
          <Label>Дата игры</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !playDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {playDate ? format(playDate, "PPP") : <span>Выберите дату</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={playDate}
                onSelect={setPlayDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Автор</Label>
          <Select 
            value={authorId.toString()} 
            onValueChange={(value) => setAuthorId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Выберите автора" />
            </SelectTrigger>
            <SelectContent>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id.toString()}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setEditMode(false);
              setTitle(packageData.title);
              setDescription(packageData.description || "");
              setPlayDate(packageData.playDate ? new Date(packageData.playDate) : undefined);
              setAuthorId(packageData.authorId);
            }}
          >
            Отмена
          </Button>
          <Button type="submit">Сохранить</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
        <div className="flex gap-2 mt-2">
          {playDate && (
            <Badge variant="secondary">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {format(new Date(playDate), "PP")}
            </Badge>
          )}
          {packageData.author && (
            <Badge variant="outline">
              Автор: {packageData.author.username}
            </Badge>
          )}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={() => setEditMode(true)}>
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
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
  const [isGenerateQuestionsDialogOpen, setIsGenerateQuestionsDialogOpen] = useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
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
  const createQuestionForm = useForm<{ content: any; answer: string; difficulty: number }>({
    defaultValues: {
      content: {},
      answer: "",
      difficulty: 1,
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
        method: "PUT",
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
        packageId: parseInt(params.id),
      };

      const response = await fetch(`/api/rounds`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(roundData),
      });

      console.log('Round creation response status:', response.status);
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
        throw new Error(responseData?.error || `Failed to add round: ${response.statusText}`);
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
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(data),
        });

        console.log('Question update response status:', response.status);
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
          throw new Error(responseData?.error || `Failed to save question: ${response.statusText}`);
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
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          questionId,
          orderIndex: position,
        }),
      });

      console.log('Add question response status:', response.status);
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
        throw new Error(responseData?.error || `Failed to add question to round: ${response.statusText}`);
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
        setIsCreatingQuestion(true);
        break;
      case "search":
        setIsSearchDialogOpen(true);
        break;
      case "generate":
        setIsGenerateQuestionsDialogOpen(true);
        break;
    }
  };

  const handleCreateQuestion = async (data: { content: any; answer: string; difficulty: number }) => {
    try {
      const response = await fetch('/api/questions', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({          title: "Вопрос",
          ...data,
        }),
      });

      console.log('Create question response status:', response.status);
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
        throw new Error(responseData?.error || `Failed to create question: ${response.statusText}`);
      }

      // Add the new question to the current round
      if (currentRoundId) {
        const round = packageData?.rounds.find((r) => r.id === currentRoundId);
        if (round) {
          const questionId = responseData.id || responseData.data?.id;
          if (!questionId) {
            throw new Error('No question ID in response');
          }
          await handleAddQuestion(currentRoundId, questionId, round.questions?.length || 0);
        }
      }

      setIsCreatingQuestion(false);
      createQuestionForm.reset();
      toast({
        title: "Успех",
        description: "Вопрос создан",
      });
    } catch (error: any) {
      console.error('Error creating question:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateQuestions = async (data: { prompt: string; count: number }) => {
    if (!currentRoundId) {
      toast({
        title: "Ошибка",
        description: "Выберите раунд для добавления вопросов",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/questions/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ 
          prompt: data.prompt,
          count: data.count
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const generatedQuestions = await response.json();

      // Add each generated question to the current round
      for (const question of generatedQuestions) {
        const round = packageData?.rounds.find((r) => r.id === currentRoundId);
        if (round) {
          await handleAddQuestion(currentRoundId, question.id, round.questions?.length || 0);
        }
      }

      setIsGenerateQuestionsDialogOpen(false);
      toast({
        title: "Успех",
        description: `Сгенерировано ${generatedQuestions.length} новых вопросов`
      });
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async (roundId: number, questionId: number) => {
    try {
      const response = await fetch(`/api/rounds/${roundId}/questions/${questionId}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text);
      }

      // Обновляем данные пакета после удаления вопроса
      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: "include",
        headers: {
          "Accept": "application/json",
        },
      });

      if (!updatedResponse.ok) {
        throw new Error("Failed to fetch updated package data");
      }

      const updatedData = await updatedResponse.json();
      setPackageData(updatedData);

      toast({
        title: "Успех",
        description: "Вопрос удален из раунда",
      });
    } catch (error: any) {
      console.error('Error deleting question:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdatePackage = async (data: Partial<Package>) => {
    try {
      const response = await fetch(`/api/packages/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updatedPackage = await response.json();
      setPackageData(updatedPackage);
    } catch (error: any) {
      console.error("Error updating package:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDragStart = () => {
    // Add drag started state if needed
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !packageData) return;

    const sourceRoundId = parseInt(result.source.droppableId.replace('round-', ''));
    const destinationRoundId = parseInt(result.destination.droppableId.replace('round-', ''));
    const questionId = parseInt(result.draggableId.replace('question-', ''));

    // Создаем глубокую копию данных пакета для оптимистичного обновления
    const newPackageData = JSON.parse(JSON.stringify(packageData));

    const sourceRound = newPackageData.rounds.find(r => r.id === sourceRoundId);
    const destinationRound = newPackageData.rounds.find(r => r.id === destinationRoundId);

    if (!sourceRound || !destinationRound) {
      console.error('Source or destination round not found');
      return;
    }

    try {
      // Оптимистичное обновление UI
      const [movedQuestion] = sourceRound.questions.splice(result.source.index, 1);
      destinationRound.questions.splice(result.destination.index, 0, movedQuestion);
      setPackageData(newPackageData);

      // Отправляем запрос на сервер
      const response = await fetch(`/api/rounds/${destinationRoundId}/questions/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          newIndex: result.destination.index,
          sourceRoundId: sourceRoundId !== destinationRoundId ? sourceRoundId : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update question order');
      }

      // Обновляем данные с сервера
      const updatedResponse = await fetch(`/api/packages/${params.id}`, {
        credentials: 'include',
      });

      if (!updatedResponse.ok) {
        throw new Error('Failed to fetch updated package data');
      }

      const updatedData = await updatedResponse.json();
      setPackageData(updatedData);
    } catch (error: any) {
      console.error('Error reordering questions:', error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
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
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link to="/packages">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Назад к пакетам
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : packageData ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={25} minSize={20}>
              <div className="h-[calc(100vh-8rem)] p-6 border rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Раунды</h2>
                  <Button size="sm" onClick={handleAddRound}>
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить
                  </Button>
                </div>
                <ScrollArea className="h-[calc(100%-4rem)]">
                  <div className="space-y-2 pr-4">
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
              <div className="h-[calc(100vh-8rem)] p-6 border rounded-lg space-y-6">
                <PackageHeader packageData={packageData} onSave={handleUpdatePackage} />

                <div className="space-y-8">
                  {packageData.rounds.map((round) => (
                    <div key={round.id} className="space-y-4">
                      <RoundHeader
                        round={round}
                        onSave={handleUpdateRound}
                      />

                      {round.questions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          В этом раунде пока нет вопросов
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {round.questions.map((question, index) => (
                            <div
                              key={`${round.id}-${question.id}`}
                              ref={el => questionRefs.current[`${round.id}-${question.id}`] = el}
                            >
                              <QuestionItem
                                question={question}
                                index={index}
                                roundId={round.id}
                                roundQuestionCount={round.questionCount}
                                handleAutoSave={handleAutoSave}
                                handleDelete={handleDeleteQuestion}
                                form={form}
                                packageData={packageData}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button
                          variant="outline"
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
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div>Пакет не найден</div>
        )}

        <AddQuestionDialog
          open={isAddQuestionDialogOpen}
          onOpenChange={setIsAddQuestionDialogOpen}
          onSelect={handleAddQuestionSelect}
        />

        <GenerateQuestionsDialog 
          open={isGenerateQuestionsDialogOpen}
          onOpenChange={setIsGenerateQuestionsDialogOpen}
          onSubmit={handleGenerateQuestions}
        />

        <Dialog open={isSearchDialogOpen} onOpenChange={setIsSearchDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Поиск вопросов</DialogTitle>
              <DialogDescription>
                Найдите существующие вопросы для добавления в раунд
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
                        <Input
                          {...field}
                          placeholder="Поиск по содержанию вопроса"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {availableQuestions.map((question) => (
                  <Card key={question.id} className="cursor-pointer hover:bg-accent">
                    <CardContent
                      className="pt-6"
                      onClick={() =>
                        currentRoundId &&
                        handleAddQuestion(
                          currentRoundId,
                          question.id,
                          packageData?.rounds.find((r) => r.id === currentRoundId)
                            ?.questions.length || 0
                        )
                      }
                    >
                      <div className="space-y-2">
                        <div className="text-sm">{getContentPreview(question.content)}</div>
                        <div className="text-xs text-muted-foreground">
                          {question.author?.username}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreatingQuestion} onOpenChange={setIsCreatingQuestion}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый вопрос</DialogTitle>
              <DialogDescription>
                Создайте новый вопрос для добавления в раунд
              </DialogDescription>
            </DialogHeader>

            <Form {...createQuestionForm}>
              <form
                onSubmit={createQuestionForm.handleSubmit(handleCreateQuestion)}
                className="space-y-4"
              >
                <FormField
                  control={createQuestionForm.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Текст вопроса</FormLabel>
                      <FormControl>
                        <WysiwygEditor
                          content={field.value}
                          onChange={field.onChange}
                          className="min-h-[200px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createQuestionForm.control}
                  name="answer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ответ</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createQuestionForm.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Сложность</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreatingQuestion(false)}
                  >
                    Отмена
                  </Button>
                  <Button type="submit">Создать</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {isSaving && <AutoSaveStatus saving={true} />}
      </div>
    </DragDropContext>
  );
}

function getContentPreview(content: any): string {
  try {
    if (!content?.content) return 'Нет содержимого';
    return content.content
      .map((node: any) => node.content?.map((n: any) => n.text).join('') || '')
      .join(' ')
      .slice(0, 100);
  } catch {
    return 'Ошибка отображения';
  }
}