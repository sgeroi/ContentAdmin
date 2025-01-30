import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Round {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  orderIndex: number;
  templateId?: number;
  packageId?: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateRoundData {
  name: string;
  description: string;
  questionCount: number;
  orderIndex: number;
  templateId?: number;
  packageId?: number;
}

export function useRounds() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rounds = [], isLoading } = useQuery<Round[]>({
    queryKey: ["/api/rounds"],
    queryFn: async () => {
      const response = await fetch("/api/rounds", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      // Convert snake_case to camelCase
      return data.map((round: any) => ({
        id: round.id,
        name: round.name,
        description: round.description,
        questionCount: round.question_count,
        orderIndex: round.order_index,
        templateId: round.template_id,
        packageId: round.package_id,
        createdAt: round.created_at,
        updatedAt: round.updated_at,
      }));
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRoundData) => {
      const response = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          questionCount: data.questionCount,
          orderIndex: data.orderIndex,
          templateId: data.templateId,
          packageId: data.packageId,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to create round");
      }

      const roundData = await response.json();
      return {
        id: roundData.id,
        name: roundData.name,
        description: roundData.description,
        questionCount: roundData.question_count,
        orderIndex: roundData.order_index,
        templateId: roundData.template_id,
        packageId: roundData.package_id,
        createdAt: roundData.created_at,
        updatedAt: roundData.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      toast({
        title: "Успех",
        description: "Раунд успешно создан",
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

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...data
    }: CreateRoundData & { id: number }) => {
      const response = await fetch(`/api/rounds/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to update round");
      }

      const roundData = await response.json();
      return {
        id: roundData.id,
        name: roundData.name,
        description: roundData.description,
        questionCount: roundData.question_count,
        orderIndex: roundData.order_index,
        templateId: roundData.template_id,
        packageId: roundData.package_id,
        createdAt: roundData.created_at,
        updatedAt: roundData.updated_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      toast({
        title: "Успех",
        description: "Раунд успешно обновлен",
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
      const response = await fetch(`/api/rounds/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete round");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
      toast({
        title: "Успех",
        description: "Раунд успешно удален",
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
    rounds,
    isLoading,
    createRound: createMutation.mutateAsync,
    updateRound: updateMutation.mutateAsync,
    deleteRound: deleteMutation.mutateAsync,
  };
}