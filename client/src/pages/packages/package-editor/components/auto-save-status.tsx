// utils
import { cn } from "@/lib/utils";

export function AutoSaveStatus({ saving }: { saving: boolean }) {
  return (
    <div className="fixed top-4 right-4 flex items-center gap-2 text-sm text-muted-foreground">
      <div
        className={cn(
          "h-2 w-2 rounded-full transition-colors",
          saving ? "bg-yellow-500" : "bg-green-500"
        )}
      />
      {saving ? "Сохранение..." : "Все изменения сохранены"}
    </div>
  );
}
