import { useCallback, useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { FixedSizeList as List, ListOnItemsRenderedProps } from "react-window";
import { useParams } from "wouter";
import qs from "qs";
// ui
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
// utils
import { getContentPreview } from "@/lib/utils";
// api
import axiosClient from "@/api/axiosClient";
// hooks
import { useToast } from "@/hooks/use-toast";
// types
import type { Question } from "@db/schema";

interface AddQuestionSearchDialogProps {
  open: boolean;
  onQuestionAdd: (questionId: number) => void;
  onOpenChange: (open: boolean) => void;
}

type QuestionSearchFilters = {
  q: string;
};

const PAGE_SIZE = 50;
const ROW_HEIGHT = 80;
const ROW_GAP = 8;

export function AddQuestionSearchDialog({
  onQuestionAdd,
  open,
  onOpenChange,
}: AddQuestionSearchDialogProps) {
  const params = useParams();
  const { toast } = useToast();

  // Search text state (debounced for the API call)
  const [filterGlobal, setFilterGlobal] = useState("");
  const [debouncedFilterGlobal] = useDebounce(filterGlobal, 1000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination and questions state
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Fetch a page of questions given the current packageId and filters.
  const fetchQuestions = useCallback(
    async (
      packageId: string,
      filters: QuestionSearchFilters,
      page: number = 1
    ) => {
      try {
        console.log("fetching");
        setIsLoading(true);
        const url = `/api/packages/${packageId}/available-questions`;
        const response = await axiosClient.get(url, {
          params: {
            ...filters,
            page,
            limit: PAGE_SIZE,
          },
          paramsSerializer: (params) =>
            qs.stringify(params, { arrayFormat: "repeat" }),
        });

        // Assume the API returns an array of questions for the current page.
        const newQuestions: Question[] = response.data;

        if (page === 1) {
          setAvailableQuestions(newQuestions);
        } else {
          setAvailableQuestions((prev) => [...prev, ...newQuestions]);
        }

        // If we received fewer questions than PAGE_SIZE, then there are no more questions.
        setHasMore(newQuestions.length === PAGE_SIZE);
      } catch (error: any) {
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    if (!open) {
      setFilterGlobal("");
      setAvailableQuestions([]);
      setPage(1);
      setHasMore(true);
    }
  }, [open]);

  useEffect(() => {
    if (open && params.id) {
      setPage(1);
      setHasMore(true);
      fetchQuestions(params.id, { q: debouncedFilterGlobal }, 1);
    }
  }, [open, params.id, debouncedFilterGlobal, fetchQuestions]);

  // Fetch the next page when needed.
  const fetchNextPage = () => {
    if (!params.id || isLoading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchQuestions(params.id, { q: debouncedFilterGlobal }, nextPage);
  };

  // If there are more items, we show one extra row as a loading indicator.
  const itemCount = hasMore
    ? availableQuestions.length + 1
    : availableQuestions.length;

  const handleQuestionSelection = (questionId: number) => {
    if (isSubmitting) return; // Prevent further clicks.

    onQuestionAdd(questionId);
    if (params.id) {
      setFilterGlobal("");
    }
  };

  // Row renderer for react-window.
  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    // Extra row for loading or "no more items" indicator.
    if (index >= availableQuestions.length) {
      return (
        <div style={style} className="p-3 text-center">
          {isLoading ? "Загрузка..." : "Больше вопросов нет"}
        </div>
      );
    }

    const question = availableQuestions[index];
    // Determine if this row is the last visible question row.
    // We remove the gap only if there are no more items to load.
    const isLastQuestionRow =
      index === availableQuestions.length - 1 && !hasMore;

    return (
      <div style={style}>
        <div
          className="p-3 rounded-lg border cursor-pointer hover:bg-accent"
          style={{
            // For all rows except the last, subtract the gap from the inner height.
            height: isLastQuestionRow ? ROW_HEIGHT : ROW_HEIGHT - ROW_GAP,
            // For all rows except the last, add a bottom margin equal to the gap.
            marginBottom: isLastQuestionRow ? 0 : ROW_GAP,
          }}
          onClick={() => handleQuestionSelection(question.id)}
        >
          <div>{getContentPreview(question.content)}</div>
          <div className="text-sm text-muted-foreground mt-1">
            Автор: {question?.author?.username} • Создан:{" "}
            {new Date(question.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить вопрос</DialogTitle>
          <DialogDescription>
            Найдите существующий вопрос для добавления в раунд
          </DialogDescription>
        </DialogHeader>
        <div>
          <Input
            placeholder="Поиск по тексту..."
            value={filterGlobal}
            onChange={(e) => setFilterGlobal(e.target.value)}
          />
        </div>
        <ScrollArea className="h-[400px] mt-4">
          <List
            height={400}
            itemCount={itemCount}
            itemSize={ROW_HEIGHT} // The fixed height includes room for the gap.
            width="100%"
            onItemsRendered={(props: ListOnItemsRenderedProps) => {
              const { visibleStopIndex } = props;
              if (
                visibleStopIndex >= availableQuestions.length - 1 &&
                hasMore &&
                !isLoading
              ) {
                fetchNextPage();
              }
            }}
          >
            {Row}
          </List>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
