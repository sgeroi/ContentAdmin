import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
// ui
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ResizablePanel } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
// components
import { RoundHeader } from "./components/round-header";
import { WysiwygEditor } from "@/components/wysiwyg-editor";
// utils
import { cn } from "@/lib/utils";
// types
import type { Round } from "@/pages/rounds/rounds.type";
import type { PackageQuestion } from "../packages.types";
import type {
  HandleUpdateRound,
  HandleAutoSave,
  HandleCreateQuestion,
  HandleDeleteQuestion,
  OnCreatingQuestionCancel,
  OnQuestionAdd,
} from "./package-editor.types";

interface PackageEditorProps {
  isCreatingQuestion: boolean;
  rounds: Round[];
  activeQuestionId: string | null;
  currentRoundId: string | number | null;
  questionRefs: React.MutableRefObject<{
    [key: string]: HTMLDivElement | null;
  }>;
  handleUpdateRound: HandleUpdateRound;
  handleAutoSave: HandleAutoSave;
  handleCreateQuestion: HandleCreateQuestion;
  handleDeleteQuestion: HandleDeleteQuestion;
  onCreatingQuestionCancel: OnCreatingQuestionCancel;
  onQuestionAdd: OnQuestionAdd;
}

export function PackageEditorContent({
  rounds,
  activeQuestionId,
  currentRoundId,
  isCreatingQuestion,
  questionRefs,
  handleUpdateRound,
  handleAutoSave,
  handleCreateQuestion,
  handleDeleteQuestion,
  onCreatingQuestionCancel,
  onQuestionAdd,
}: PackageEditorProps) {
  const createQuestionForm = useForm<{
    content: any;
    answer: string;
    difficulty: number;
  }>({
    defaultValues: {
      content: {},
      answer: "",
      difficulty: 1,
    },
  });

  return (
    <ResizablePanel defaultSize={75}>
      <ScrollArea className="h-full">
        <div className="container py-6 space-y-8 pl-12 pr-16">
          {rounds.map((round) => (
            <div key={round.id} className="space-y-4">
              <RoundHeader round={round} onSave={handleUpdateRound} />
              <div className="space-y-4">
                {round.questions.map((question, index) => (
                  <div
                    key={`${round.id}-${question.id}`}
                    ref={(el) =>
                      (questionRefs.current[`${round.id}-${question.id}`] = el)
                    }
                    className={cn(
                      "rounded-lg border bg-card p-4",
                      activeQuestionId === `${round.id}-${question.id}` &&
                        "ring-2 ring-primary"
                    )}
                  >
                    <QuestionItem
                      question={question}
                      index={question.id}
                      roundId={round.id}
                      roundQuestionCount={round.questionCount}
                      handleAutoSave={handleAutoSave}
                      handleDelete={handleDeleteQuestion}
                    />
                  </div>
                ))}
                {isCreatingQuestion && currentRoundId === round.id && (
                  <div className="rounded-lg border bg-card p-4">
                    <Form {...createQuestionForm}>
                      <form
                        onSubmit={createQuestionForm.handleSubmit(
                          handleCreateQuestion
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={createQuestionForm.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Текст вопроса</FormLabel>
                              <FormControl>
                                <WysiwygEditor
                                  content={field.value}
                                  onChange={field.onChange}
                                  className="min-h-[200px]"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createQuestionForm.control}
                          name="answer"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ответ</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={createQuestionForm.control}
                          name="difficulty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Сложность</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  max={5}
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={onCreatingQuestionCancel}
                          >
                            Отмена
                          </Button>
                          <Button type="submit">Создать</Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => onQuestionAdd(round.id)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить вопрос
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </ResizablePanel>
  );
}

interface QuestionItemProps {
  question: PackageQuestion;
  index: number;
  roundId: number;
  roundQuestionCount: number;
  handleAutoSave: HandleAutoSave;
  handleDelete: HandleDeleteQuestion;
}

function QuestionItem({
  question,
  index,
  roundId,
  roundQuestionCount,
  handleAutoSave,
  handleDelete,
}: QuestionItemProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">
              Вопрос {index + 1} из {roundQuestionCount}
            </span>
            <Badge variant="outline">{question.author.username}</Badge>
          </div>
          <WysiwygEditor
            content={question.content}
            onChange={(content) => handleAutoSave(question.id, { content })}
            className="min-h-[200px]"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => handleDelete(roundId, question.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div>
        <Label>Ответ</Label>
        <Input
          value={question.answer}
          onChange={(e) =>
            handleAutoSave(question.id, { answer: e.target.value })
          }
        />
      </div>
    </div>
  );
}
