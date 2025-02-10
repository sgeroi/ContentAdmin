import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Package, InsertPackage } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

type CreatePackageData = Omit<InsertPackage, "authorId">;

export function usePackages() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: packages = [], isLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
  });

  const createMutation = useMutation({
    mutationFn: async (pkg: CreatePackageData) => {
      const response = await fetch("/api/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...pkg,
          playDate: pkg.playDate ? new Date(pkg.playDate).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Успех",
        description: "Пакет создан успешно",
      });
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
    mutationFn: async ({ id, ...pkg }: CreatePackageData & { id: number }) => {
      const response = await fetch(`/api/packages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...pkg,
          playDate: pkg.playDate ? new Date(pkg.playDate).toISOString() : null,
        }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Успех",
        description: "Пакет обновлен успешно",
      });
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
      const response = await fetch(`/api/packages/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packages"] });
      toast({
        title: "Успех",
        description: "Пакет удален успешно",
      });
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
    packages,
    isLoading,
    createPackage: createMutation.mutateAsync,
    updatePackage: updateMutation.mutateAsync,
    deletePackage: deleteMutation.mutateAsync,
  };
}
