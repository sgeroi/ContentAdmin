import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePackages } from "@/hooks/use-packages";
import { useTemplates } from "@/hooks/use-templates";
import { Plus, Trash2, FileText, Eye, CalendarIcon, Search } from "lucide-react";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import type { Package } from "@db/schema";
import { format } from "date-fns";
import { useUser } from "@/hooks/use-user";

const getPackageStatus = (pkg: Package) => {
  if (!pkg.rounds?.length) return { label: "Новый", color: "bg-blue-500" };

  const hasQuestions = pkg.rounds.some(r => r.questions?.length > 0);
  if (!hasQuestions) return { label: "Новый", color: "bg-blue-500" };

  const allQuestionsFactChecked = pkg.rounds.every(r => 
    r.questions?.every(q => q.factChecked)
  );
  if (allQuestionsFactChecked) return { label: "Готов", color: "bg-green-500" };

  const hasFactCheckedQuestions = pkg.rounds.some(r => 
    r.questions?.some(q => q.factChecked)
  );
  if (hasFactCheckedQuestions) return { label: "Факт-чек", color: "bg-yellow-500" };

  return { label: "Редактура", color: "bg-orange-500" };
};

type Round = {
  id?: number;
  name: string;
  description: string;
  questionCount: number;
  orderIndex: number;
};

type CreatePackageData = {
  title: string;
  description?: string;
  templateId?: number;
  rounds: Round[];
};

type PackageFilters = {
  search: string;
  status: string;
  sortBy: 'date' | 'title' | 'status';
  sortOrder: 'asc' | 'desc';
}

export default function Packages() {
  const { packages, createPackage, updatePackage, deletePackage } = usePackages();
  const { templates } = useTemplates();
  const { toast } = useToast();
  const { user } = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [manualRounds, setManualRounds] = useState<Round[]>([]);
  const [createMode, setCreateMode] = useState<"template" | "manual">("template");
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<PackageFilters>({
    search: '',
    status: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedTemplateId("");
    setManualRounds([]);
    setCreateMode("template");
  };

  const filteredAndSortedPackages = useMemo(() => {
    let result = [...packages];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(pkg => 
        pkg.title.toLowerCase().includes(searchLower) ||
        pkg.description?.toLowerCase().includes(searchLower) ||
        pkg.author?.username.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status) {
      result = result.filter(pkg => getPackageStatus(pkg).label === filters.status);
    }

    // Sort
    result.sort((a, b) => {
      let compareValue = 0;
      switch (filters.sortBy) {
        case 'date':
          compareValue = new Date(b.playDate || b.createdAt).getTime() - 
                        new Date(a.playDate || a.createdAt).getTime();
          break;
        case 'title':
          compareValue = a.title.localeCompare(b.title);
          break;
        case 'status':
          compareValue = getPackageStatus(a).label.localeCompare(getPackageStatus(b).label);
          break;
      }
      return filters.sortOrder === 'desc' ? compareValue : -compareValue;
    });

    return result;
  }, [packages, filters]);

  const myPackages = useMemo(() => {
    return packages.filter(pkg => pkg.authorId === user?.id);
  }, [packages, user]);

  const handleSave = async () => {
    if (!title) {
      toast({
        title: "Ошибка",
        description: "Необходимо указать название",
        variant: "destructive",
      });
      return;
    }

    try {
      const packageData: CreatePackageData = {
        title,
        description,
        rounds: manualRounds,
      };

      if (createMode === "template" && selectedTemplateId) {
        packageData.templateId = parseInt(selectedTemplateId);
      }

      await createPackage(packageData);
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addRound = () => {
    setManualRounds([
      ...manualRounds,
      {
        name: "",
        description: "",
        questionCount: 1,
        orderIndex: manualRounds.length,
      },
    ]);
  };

  const updateRound = (index: number, field: keyof Round, value: any) => {
    const newRounds = [...manualRounds];
    newRounds[index] = {
      ...newRounds[index],
      [field]: value,
    };
    setManualRounds(newRounds);
  };

  const removeRound = (index: number) => {
    setManualRounds(manualRounds.filter((_, i) => i !== index));
  };

  const handleEditClick = (id: number) => {
    setLocation(`/packages/${id}/edit`);
  };

  const PackageTable = ({ data }: { data: Package[] }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Описание</TableHead>
            <TableHead>
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setFilters(f => ({ 
                  ...f, 
                  sortBy: 'date',
                  sortOrder: f.sortBy === 'date' ? (f.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'
                }))}
              >
                Дата игры
                {filters.sortBy === 'date' && (
                  <span className="text-xs">
                    {filters.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead>Автор</TableHead>
            <TableHead>
              <div 
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setFilters(f => ({ 
                  ...f, 
                  sortBy: 'status',
                  sortOrder: f.sortBy === 'status' ? (f.sortOrder === 'asc' ? 'desc' : 'asc') : 'desc'
                }))}
              >
                Статус
                {filters.sortBy === 'status' && (
                  <span className="text-xs">
                    {filters.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </TableHead>
            <TableHead>Шаблон</TableHead>
            <TableHead>Создан</TableHead>
            <TableHead className="w-[100px]">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((pkg) => {
            const status = getPackageStatus(pkg);
            return (
              <TableRow 
                key={pkg.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleEditClick(pkg.id)}
              >
                <TableCell className="font-medium">{pkg.title}</TableCell>
                <TableCell>{pkg.description}</TableCell>
                <TableCell>
                  {pkg.playDate ? (
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(pkg.playDate), "dd.MM.yyyy")}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {pkg.author?.username || "-"}
                </TableCell>
                <TableCell>
                  <Badge className={status.color}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>{pkg.template?.name || "Пользовательский пакет"}</TableCell>
                <TableCell>{format(new Date(pkg.createdAt), "dd.MM.yyyy")}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePackage(pkg.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Пакеты вопросов</h1>
          <p className="text-muted-foreground">
            Создание и управление пакетами вопросов
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Новый пакет
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Создать новый пакет</DialogTitle>
              <DialogDescription>
                Создайте новый пакет, выбрав шаблон или создав раунды вручную
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Название</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Введите название пакета"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Введите описание пакета"
                  />
                </div>
              </div>

              <Tabs value={createMode} onValueChange={(value) => setCreateMode(value as "template" | "manual")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="template">Использовать шаблон</TabsTrigger>
                  <TabsTrigger value="manual">Создать вручную</TabsTrigger>
                </TabsList>
                <TabsContent value="template" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Выберите шаблон</Label>
                    <Select
                      value={selectedTemplateId}
                      onValueChange={setSelectedTemplateId}
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
                    {selectedTemplateId && (
                      <div className="pt-4">
                        <Label>Раунды шаблона</Label>
                        {templates
                          .find((t) => t.id.toString() === selectedTemplateId)
                          ?.roundSettings?.map((round) => (
                            <div key={round.id} className="mt-2 p-2 border rounded-lg">
                              <div className="font-medium">{round.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {round.description}
                              </div>
                              <Badge variant="secondary">
                                {round.questionCount} вопросов
                              </Badge>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Раунды</Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addRound}
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Добавить раунд
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px] rounded-md border p-4">
                      <div className="space-y-4">
                        {manualRounds.map((round, index) => (
                          <div key={index} className="space-y-2 p-4 border rounded-lg">
                            <div className="flex justify-between">
                              <Label>Раунд {index + 1}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeRound(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              placeholder="Название раунда"
                              value={round.name}
                              onChange={(e) =>
                                updateRound(index, "name", e.target.value)
                              }
                            />
                            <Textarea
                              placeholder="Описание раунда"
                              value={round.description}
                              onChange={(e) =>
                                updateRound(index, "description", e.target.value)
                              }
                            />
                            <div className="flex items-center gap-2">
                              <Label>Количество вопросов</Label>
                              <Input
                                type="number"
                                min={1}
                                value={round.questionCount}
                                onChange={(e) =>
                                  updateRound(
                                    index,
                                    "questionCount",
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-24"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </TabsContent>
              </Tabs>

              <Button onClick={handleSave} className="w-full">
                Создать пакет
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, описанию или автору..."
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.status}
          onValueChange={(value) => setFilters(f => ({ ...f, status: value }))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="Новый">Новый</SelectItem>
            <SelectItem value="Редактура">Редактура</SelectItem>
            <SelectItem value="Факт-чек">Факт-чек</SelectItem>
            <SelectItem value="Готов">Готов</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* My Packages */}
      {myPackages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Мои пакеты</h2>
          <PackageTable data={myPackages} />
        </div>
      )}

      {/* All Packages */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Все пакеты</h2>
        <PackageTable data={filteredAndSortedPackages} />
      </div>
    </div>
  );
}