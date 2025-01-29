import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Question, InsertQuestion } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

interface ValidationResult {
  isValid: boolean;
  spellingErrors: string[];
  grammarErrors: string[];
  punctuationErrors: string[];
  factualIssues: string[];
  suggestions: string[];
  citations: string[];
  correctedTitle: string;
  correctedContent: any;
}

export function useQuestions(id?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query for all questions with longer cache time
  const { data: questions = [], isLoading: isLoadingList } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Query for individual question
  const { data: question, isLoading: isLoadingOne } = useQuery<Question>({
    queryKey: ["/api/questions", id],
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    initialData: id && questions ? questions.find(q => q.id.toString() === id) : undefined,
  });

  // Prefetch individual question
  const prefetchQuestion = async (questionId: string) => {
    await queryClient.prefetchQuery({
      queryKey: ["/api/questions", questionId],
      staleTime: 1000 * 60 * 5,
    });
  };

  const validateMutation = useMutation({
    mutationFn: async (data: { title: string; content: any; topic: string }) => {
      const response = await fetch("/api/questions/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json() as Promise<ValidationResult>;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (question: Omit<InsertQuestion, "authorId">) => {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(question),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update both queries
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.setQueryData(["/api/questions", data.id.toString()], data);
    },
    onError: (error: any) => {
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
      ...question
    }: Omit<InsertQuestion, "authorId"> & { id: number }) => {
      const response = await fetch(`/api/questions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(question),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Update both queries
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.setQueryData(["/api/questions", data.id.toString()], data);
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: (_, id) => {
      // Remove from both queries
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      queryClient.removeQueries({ queryKey: ["/api/questions", id.toString()] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const factCheckMutation = useMutation({
    mutationFn: async (data: { title: string; content: any; topic: string }) => {
      const response = await fetch("/api/questions/factcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json() as Promise<ValidationResult>;
    },
  });

  return {
    questions,
    question,
    isLoading: isLoadingList || isLoadingOne,
    prefetchQuestion,
    validateQuestion: validateMutation.mutateAsync,
    factCheckQuestion: factCheckMutation.mutateAsync,
    createQuestion: createMutation.mutateAsync,
    updateQuestion: updateMutation.mutateAsync,
    deleteQuestion: deleteMutation.mutateAsync,
  };
}