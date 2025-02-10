import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getContentPreview(content: any): string {
  try {
    if (content?.content) {
      let preview = "";
      const extractText = (nodes: any[]): string => {
        let text = "";
        for (const node of nodes) {
          if (node.text) {
            text += node.text;
          }
          if (node.content) {
            text += extractText(node.content);
          }
        }
        return text;
      };
      preview = extractText(content.content);
      return preview.length > 50 ? preview.slice(0, 50) + "..." : preview;
    }
    return "Нет содержания";
  } catch (error) {
    console.error("Error parsing content:", error);
    return "Ошибка контента";
  }
}
