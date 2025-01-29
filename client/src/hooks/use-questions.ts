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

export function useQuestions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: questions = [], isLoading } = useQuery<Question[]>({
    queryKey: ["/api/questions"],
  });

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
      // Validate first
      const validation = await validateMutation.mutateAsync(question);

      if (!validation.isValid) {
        throw new Error(
          "Question validation failed:\n" +
            [
              ...validation.spellingErrors,
              ...validation.grammarErrors,
              ...validation.punctuationErrors,
              ...validation.factualIssues,
              ...validation.suggestions,
            ].join("\n")
        );
      }

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
      toast({
        title: "Success",
        description: "Question created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
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
      toast({
        title: "Success",
        description: "Question updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
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
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
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
    isLoading,
    validateQuestion: validateMutation.mutateAsync,
    factCheckQuestion: factCheckMutation.mutateAsync,
    createQuestion: createMutation.mutateAsync,
    updateQuestion: updateMutation.mutateAsync,
    deleteQuestion: deleteMutation.mutateAsync,
  };
}