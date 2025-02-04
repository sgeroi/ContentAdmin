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

interface QuestionsResponse {
  questions: Question[];
  total: number;
  page: number;
  limit: number;
}

interface QuestionWithPackages extends Question {
  packages: Array<{
    id: number;
    title: string;
    playDate: string | null;
  }>;
}

export function useQuestions(page: number = 1) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<QuestionsResponse>({
    queryKey: ["/api/questions", page],
    queryFn: async () => {
      const response = await fetch(`/api/questions?page=${page}&limit=10`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  const getQuestion = async (id: number): Promise<QuestionWithPackages> => {
    const response = await fetch(`/api/questions/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
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
      const response = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
    },
    onError: (error) => {
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
    questions: data?.questions ?? [],
    total: data?.total ?? 0,
    currentPage: data?.page ?? page,
    limit: data?.limit ?? 10,
    isLoading,
    getQuestion,
    validateQuestion: validateMutation.mutateAsync,
    factCheckQuestion: factCheckMutation.mutateAsync,
    createQuestion: createMutation.mutateAsync,
    updateQuestion: updateMutation.mutateAsync,
    deleteQuestion: deleteMutation.mutateAsync,
  };
}