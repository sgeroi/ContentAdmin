import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface Round {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateRoundData {
  name: string;
  description: string;
  questionCount: number;
}

export function useRounds() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rounds = [], isLoading } = useQuery<Round[]>({
    queryKey: ["/api/rounds"],
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRoundData) => {
      const response = await fetch("/api/rounds", {
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
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: CreateRoundData & { id: number }) => {
      const response = await fetch(`/api/rounds/${id}`, {
        method: "PUT",
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
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
    },
    onError: (error) => {
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
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rounds"] });
    },
    onError: (error) => {
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