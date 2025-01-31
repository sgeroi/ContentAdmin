import { useQuery } from "@tanstack/react-query";
import type { User } from "@db/schema";

export function useUsers() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
    },
  });

  return {
    users,
    isLoading,
  };
}
