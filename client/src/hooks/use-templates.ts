import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TemplateRoundSetting {
  id: number;
  roundId: number;
  name: string;
  description: string;
  questionCount: number;
  editorNotes: string;
  orderIndex: number;
}

interface Template {
  id: number;
  name: string;
  description: string;
  roundSettings: TemplateRoundSetting[];
  createdAt: string;
  updatedAt: string;
}

interface CreateTemplateData {
  name: string;
  description: string;
}

interface UpdateTemplateRoundData {
  templateId: number;
  roundId: number;
  name?: string;
  description?: string;
  questionCount?: number;
  editorNotes?: string;
  orderIndex?: number;
}

interface AddRoundData {
  templateId: number;
  roundId: number;
  name?: string;
  description?: string;
  questionCount?: number;
  editorNotes?: string;
  orderIndex?: number;
}

export function useTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["/api/templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Успех",
        description: "Шаблон успешно создан",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoundSettingsMutation = useMutation({
    mutationFn: async (data: UpdateTemplateRoundData) => {
      const response = await fetch(`/api/templates/${data.templateId}/rounds/${data.roundId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name || "",
          description: data.description || "",
          questionCount: data.questionCount || 0,
          editorNotes: data.editorNotes || "",
          orderIndex: data.orderIndex || 0,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Успех",
        description: "Настройки раунда обновлены",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addRoundMutation = useMutation({
    mutationFn: async (data: AddRoundData) => {
      const response = await fetch(`/api/templates/${data.templateId}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          roundId: data.roundId,
          orderIndex: data.orderIndex || 0,
          questionCount: data.questionCount || 0,
          name: data.name || "",
          description: data.description || "",
          editorNotes: data.editorNotes || "",
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Успех",
        description: "Раунд добавлен в шаблон",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeRoundMutation = useMutation({
    mutationFn: async ({ templateId, roundId }: { templateId: number; roundId: number }) => {
      const response = await fetch(`/api/templates/${templateId}/rounds/${roundId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Успех",
        description: "Раунд удален из шаблона",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({
        title: "Успех",
        description: "Шаблон удален",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createMutation.mutateAsync,
    updateRoundSettings: updateRoundSettingsMutation.mutateAsync,
    addRound: addRoundMutation.mutateAsync,
    removeRound: removeRoundMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
  };
}