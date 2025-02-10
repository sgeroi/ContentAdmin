import { useState } from "react";
import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, GripVertical, Plus } from "lucide-react";
// ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ResizablePanel } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
// utils
import { cn } from "@/lib/utils";
import { getContentPreview } from "@/lib/utils";
// types
import type { Round } from "@/pages/rounds/rounds.type";

interface PackageEditorSidebarProps {
  activeQuestionId: string | null;
  rounds: Round[];
  onDragStart: (event: DragStartEvent) => void;
  onDragMove: (evnet: DragMoveEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onQuestionClick: (id: string) => void;
  onAddRound: () => void;
}

export function PackageEditorSidebar({
  activeQuestionId,
  rounds,
  onDragStart,
  onDragMove,
  onDragEnd,
  onQuestionClick,
  onAddRound,
}: PackageEditorSidebarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
      <div className="h-full border-r flex flex-col container">
        <ScrollArea className="flex-1">
          <div className="space-y-4 py-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
            >
              <SortableContext items={rounds.map((round) => round.id)}>
                {rounds.map((round) => (
                  <NavigationItem
                    key={round.id}
                    round={round}
                    activeQuestionId={activeQuestionId}
                    onQuestionClick={onQuestionClick}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </ScrollArea>
        <div className="py-4 border-t">
          <Button className="w-full" onClick={onAddRound}>
            <Plus className="h-4 w-4 mr-2" />
            Добавить раунд
          </Button>
        </div>
      </div>
    </ResizablePanel>
  );
}

interface NavigationItemProps {
  round: Round;
  activeQuestionId: string | null;
  onQuestionClick: (id: string) => void;
}

function NavigationItem({
  round,
  activeQuestionId,
  onQuestionClick,
}: NavigationItemProps) {
  const [isOpen, setIsOpen] = useState(true);

  const {
    attributes,
    setNodeRef,
    // listeners,
    transform,
    transition,
    // isDragging,
  } = useSortable({
    id: round.id,
    data: {
      type: "round",
    },
  });

  return (
    <div
      {...attributes}
      ref={setNodeRef}
      style={{
        transition,
        transform: CSS.Translate.toString(transform),
      }}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between py-2 hover:bg-accent rounded px-2">
          <div className="flex items-center gap-2">
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-90"
              )}
            />
            <span>Раунд {round.orderIndex + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {round.questions.length} / {round.questionCount}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-6 space-y-1">
          <SortableContext items={round.roundQuestions.map(({ id }) => id)}>
            {round.roundQuestions.map(({ id, question }, index) => (
              <QuestionItem
                activeQuestionId={activeQuestionId}
                key={id}
                tempId={question.id}
                questionId={id}
                roundId={round.id}
                questionContent={question.content as string}
                onQuestionClick={onQuestionClick}
                orderIndex={index + 1}
              />
            ))}
          </SortableContext>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface QuestionItemProps {
  tempId: number;
  questionId: number | string;
  roundId: number | string;
  questionContent: string;
  activeQuestionId: string | null;
  orderIndex: number;
  onQuestionClick: (id: string) => void;
}

function QuestionItem({
  tempId,
  questionId,
  roundId,
  questionContent,
  activeQuestionId,
  orderIndex,
  onQuestionClick,
}: QuestionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: questionId,
      data: {
        type: "question",
      },
    });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  return (
    <div className="flex flex-row items-center">
      <div className="w-[10px] flex items-center">
        <span className="text-muted-foreground text-sm">{orderIndex}</span>
      </div>
      <div
        ref={setNodeRef}
        {...attributes}
        style={style}
        key={questionId}
        className={cn(
          "py-1 px-2 rounded cursor-pointer text-sm flex items-center gap-2 w-full",
          activeQuestionId === `${roundId}-${tempId}` && "bg-accent"
        )}
        onClick={() => onQuestionClick(`${roundId}-${tempId}`)}
      >
        <div className="flex flex-row w-full items-center">
          <div {...listeners} className="w-[10%]">
            <GripVertical size="16" />
          </div>
          <div className="w-[90%]">
            <span className="truncate">
              {getContentPreview(questionContent)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
