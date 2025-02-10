import { useState, useEffect } from "react";
import { Edit2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
// ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
// types
import type { Package } from "@db/schema";
import type { PackageWithRounds } from "@/pages/packages/packages.types";
// hooks
import { useUsers } from "@/hooks/use-users";
import { useToast } from "@/hooks/use-toast";
// utils
import { cn } from "@/lib/utils";

interface FormData {
  title: string;
  description: string;
  playDate?: Date;
  authorId: number;
}

export function PackageEditorHeader({
  packageData,
  onSave,
}: {
  packageData: PackageWithRounds;
  onSave: (data: Partial<Package>) => Promise<void>;
}) {
  const { users } = useUsers();
  const { toast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: packageData.title,
    description: packageData.description || "",
    playDate: packageData.playDate ? new Date(packageData.playDate) : undefined,
    authorId: packageData.authorId,
  });

  // Reset the form whenever packageData changes.
  useEffect(() => {
    setFormData({
      title: packageData.title,
      description: packageData.description || "",
      playDate: packageData.playDate
        ? new Date(packageData.playDate)
        : undefined,
      authorId: packageData.authorId,
    });
  }, [packageData]);

  const handleChange = <K extends keyof FormData>(
    key: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: packageData.title,
      description: packageData.description || "",
      playDate: packageData.playDate
        ? new Date(packageData.playDate)
        : undefined,
      authorId: packageData.authorId,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await onSave({
        title: formData.title,
        description: formData.description,
        playDate: formData.playDate ? formData.playDate.toISOString() : null,
        authorId: formData.authorId,
      });
      setEditMode(false);
      toast({
        title: "Успех",
        description: "Пакет обновлен",
      });
    } catch (error: any) {
      console.error("Error saving package:", error);
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
            value={formData.title}
            onChange={(e) => handleChange("title", e.target.value)}
            placeholder="Название пакета"
          />
        </div>
        <div className="space-y-2">
          <Label>Описание</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Описание пакета"
          />
        </div>
        <div className="space-y-2">
          <Label>Дата игры</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.playDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.playDate ? (
                  format(formData.playDate, "PPP")
                ) : (
                  <span>Выберите дату</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.playDate}
                onSelect={(date) => handleChange("playDate", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Автор</Label>
          <Select
            value={formData.authorId.toString()}
            onValueChange={(value) => handleChange("authorId", parseInt(value))}
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
              resetForm();
              setEditMode(false);
            }}
          >
            Отмена
          </Button>
          <Button type="submit">Сохранить</Button>
        </div>
      </form>
    );
  }

  // Render view mode
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold">{packageData.title}</h1>
        {packageData.description && (
          <p className="text-muted-foreground mt-1">
            {packageData.description}
          </p>
        )}
        <div className="flex gap-2 mt-2">
          {packageData.playDate && (
            <Badge variant="secondary">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {format(new Date(packageData.playDate), "PP")}
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
