import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link } from "wouter";
import { ChevronLeft } from "lucide-react";
import axiosClient from "@/api/axiosClient";
import { UniqueIdentifier } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { DragEndEvent, DragMoveEvent, DragStartEvent } from "@dnd-kit/core";
import { useForm } from "react-hook-form";
import debounce from "lodash/debounce";
import qs from "qs";
// hooks
import { useToast } from "@/hooks/use-toast";
// ui
import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
// utils
import {
  removePrefixes,
  transformPackages,
  orderRounds,
} from "@/pages/packages/packages.utils";
// components
import { PackageEditorHeader } from "./package-editor-header";
import { PackageEditorSidebar } from "./package-editor-sidebar";
import { PackageEditorContent } from "./package-editor-content";
import { AddQuestionDialog } from "./components/add-question-dialog";
import { GenerateQuestionsDialog } from "./components/generate-question-dialog";
import { AddQuestionListDialog } from "./components/add-question-list-dialog";
import { AutoSaveStatus } from "./components/auto-save-status";
// types
import type { PackageWithRounds } from "../packages.types";
import type { Package, Question } from "@db/schema";
import type {
  HandleUpdateRound,
  HandleAutoSave,
  HandleCreateQuestion,
  HandleDeleteQuestion,
  OnCreatingQuestionCancel,
  OnQuestionAdd,
} from "./package-editor.types";

// ----------------------------------------------------------------------

export type QuestionFormData = {
  content: any;
  answer: string;
};

type QuestionSearchFilters = {
  query: string;
};

export default function PackageEditor() {
  const params = useParams();
  const { toast } = useToast();
  const [packageData, setPackageData] = useState<PackageWithRounds | null>(
    null
  );
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentRoundId, setCurrentRoundId] = useState<number | null>(null);
  const [isSearchDialogOpen, setIsSearchDialogOpen] = useState(false);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false);
  const [isGenerateQuestionsDialogOpen, setIsGenerateQuestionsDialogOpen] =
    useState(false);
  const [isCreatingQuestion, setIsCreatingQuestion] = useState(false);
  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  useEffect(() => {
    fetchPackage();
  }, [params.id]);

  const fetchPackage = useCallback(async () => {
    try {
      const response = await axiosClient.get(`/api/packages/${params.id}`);
      const newData = {
        ...response.data,
        rounds: transformPackages(response.data.rounds),
      };
      setPackageData(newData);
      await fetchQuestions();
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  const handleQuestionClick = (id: string) => {
    setActiveQuestionId(id);
    const element = questionRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleUpdateRound: HandleUpdateRound = useCallback(
    async (id: number, data: { name: string; description: string }) => {
      setIsSaving(true);
      try {
        console.log("Updating round:", id, data);
        await axiosClient.put(
          `/api/rounds/${id.toString().replace(/^round-/, "")}`,
          {
            name: data.name,
            description: data.description,
          }
        );

        await fetchPackage();
        toast({
          title: "Успех",
          description: "Раунд обновлен",
        });
      } catch (error: any) {
        console.error("Error updating round:", error);
        toast({
          title: "Ошибка",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    },
    [params.id, toast, fetchPackage]
  );

  const handleAddRound = async () => {
    try {
      const orderIndex = packageData?.rounds.length || 0;
      console.log("Adding new round with index:", orderIndex);

      const roundData = {
        name: "Новый раунд",
        description: "Описание раунда",
        questionCount: 5,
        orderIndex,
        packageId: parseInt(params.id),
      };

      await axiosClient.post("/api/rounds", roundData);
      await fetchPackage();

      toast({
        title: "Успех",
        description: "Раунд добавлен",
      });
    } catch (error: any) {
      console.error("Error adding round:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAutoSaveQuestionsOrder = useCallback(
    debounce(async (rounds: any) => {
      setIsSaving(true);
      console.log("Auto-saving questions order:", rounds);

      const payload = {
        rounds: removePrefixes(orderRounds(rounds)),
      };

      try {
        await axiosClient.post(`/api/round-questions/save-order`, payload);
        await fetchPackage();
      } catch (error: any) {
        console.error("Error auto-saving:", error);
        toast({
          title: "Ошибка автосохранения",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [params.id, toast]
  );

  const handleAutoSave: HandleAutoSave = useCallback(
    debounce(async (questionId: number, data: Partial<QuestionFormData>) => {
      setIsSaving(true);
      try {
        console.log("Auto-saving question:", questionId, data);
        await axiosClient.put(`/api/questions/${questionId}`, data);
        fetchPackage();
      } catch (error: any) {
        console.error("Error auto-saving:", error);
        toast({
          title: "Ошибка автосохранения",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [params.id, toast, fetchPackage]
  );

  const handleAddQuestion = async (
    roundId: number,
    questionId: number,
    position: number
  ) => {
    try {
      await axiosClient.post(`/api/rounds/${roundId}/questions`, {
        questionId,
        orderIndex: position,
      });
      await fetchPackage();
      setIsSearchDialogOpen(false);
      toast({
        title: "Успех",
        description: "Вопрос добавлен в раунд",
      });
    } catch (error: any) {
      console.error("Error adding question:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSearch = useCallback((data: QuestionSearchFilters) => {
    fetchQuestions(data);
  }, []);

  const fetchQuestions = async (
    filters: QuestionSearchFilters = { query: "" }
  ) => {
    try {
      const params = filters.query ? { q: filters.query } : {};
      const response = await axiosClient.get("/api/questions", {
        params,
        paramsSerializer: (params) => qs.stringify(params),
      });
      setAvailableQuestions(response.data.questions);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAddQuestionSelect = (type: "manual" | "search" | "generate") => {
    setIsAddQuestionDialogOpen(false);
    switch (type) {
      case "manual":
        setIsCreatingQuestion(true);
        break;
      case "search":
        setIsSearchDialogOpen(true);
        break;
      case "generate":
        setIsGenerateQuestionsDialogOpen(true);
        break;
    }
  };

  const handleCreateQuestion: HandleCreateQuestion = async (data) => {
    try {
      const response = await axiosClient.post(`/api/questions`, {
        title: "Вопрос",
        ...data,
      });

      // Add the new question to the current round
      if (currentRoundId) {
        const round = packageData?.rounds.find((r) => r.id === currentRoundId);
        if (round) {
          const questionId = response.data.id || response.data?.data?.id;
          if (!questionId) {
            throw new Error("No question ID in response");
          }
          const roundId = Number(
            currentRoundId.toString().replace(/^round-/, "")
          );
          await handleAddQuestion(
            roundId,
            questionId,
            round.questions?.length || 0
          );
        }
      }

      setIsCreatingQuestion(false);
      createQuestionForm.reset();
      toast({
        title: "Успех",
        description: "Вопрос создан",
      });
    } catch (error: any) {
      console.error("Error creating question:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateQuestions = async (data: {
    prompt: string;
    count: number;
  }) => {
    if (!currentRoundId) {
      toast({
        title: "Ошибка",
        description: "Выберите раунд для добавления вопросов",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await axiosClient.post(`/api/questions/generate`, {
        prompt: data.prompt,
        count: data.count,
      });
      const generatedQuestions = response.data;
      // Add each generated question to the current round
      for (const question of generatedQuestions) {
        const round = packageData?.rounds.find((r) => r.id === currentRoundId);
        if (round) {
          await handleAddQuestion(
            currentRoundId,
            question.id,
            round.questions?.length || 0
          );
        }
      }
      setIsGenerateQuestionsDialogOpen(false);
      toast({
        title: "Успех",
        description: `Сгенерировано ${generatedQuestions.length} новых вопросов`,
      });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion: HandleDeleteQuestion = async (
    roundId,
    questionId
  ) => {
    try {
      if (roundId.toString().includes("round"))
        roundId = roundId.toString().replace(/^round-/, "");

      await axiosClient.delete(`api/rounds/${roundId}/questions/${questionId}`);
      await fetchPackage();
      toast({
        title: "Успех",
        description: "Вопрос удален из раунда",
      });
    } catch (error: any) {
      console.error("Error deleting question:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdatePackage = async (data: Partial<Package>) => {
    try {
      const response = await axiosClient.put(
        `/api/packages/${params.id}`,
        data
      );
      const newPackageData = {
        ...response.data,
        rounds: transformPackages(response.data.rounds),
      };
      setPackageData(newPackageData);
    } catch (error: any) {
      console.error("Error updating package:", error);
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!packageData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Пакет не найден</h2>
          <p className="text-muted-foreground mt-2">
            Возможно, он был удален или у вас нет к нему доступа
          </p>
          <Link href="/packages">
            <Button variant="link" className="mt-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Вернуться к списку пакетов
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  //UniqueIdentifier
  const findValueOfItems = (id: any, type: string) => {
    if (type === "round") {
      return packageData.rounds.find((round) => round.id === id);
    }
    if (type === "question") {
      return packageData.rounds.find((round) =>
        round.roundQuestions.find((question) => question.id === id)
      );
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { id } = active;
    setActiveId(id);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { active, over } = event;

    if (
      active.id.toString().includes("question") &&
      over?.id.toString().includes("question") &&
      over &&
      active.id !== over.id
    ) {
      const activeRound = findValueOfItems(active.id, "question");
      const overRound = findValueOfItems(over.id, "question");

      if (!activeRound || !overRound) return;

      const activeRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === activeRound.id
      );
      const overRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === overRound.id
      );
      const activeQuestionIndex = activeRound.roundQuestions.findIndex(
        (question) => question.id === active.id
      );
      const overQuestionIndex = overRound.roundQuestions.findIndex(
        (question) => question.id === over.id
      );

      if (activeRoundIndex === overRoundIndex) {
        let newRoundQuestions = [...packageData.rounds];
        newRoundQuestions[activeRoundIndex].roundQuestions = arrayMove(
          newRoundQuestions[activeRoundIndex].roundQuestions,
          activeQuestionIndex,
          overQuestionIndex
        );

        setPackageData({ ...packageData, rounds: newRoundQuestions });
        handleAutoSaveQuestionsOrder(newRoundQuestions);
      } else {
        let newRoundQuestions = [...packageData.rounds];
        const [removedItem] = newRoundQuestions[
          activeRoundIndex
        ].roundQuestions.splice(activeQuestionIndex, 1);
        newRoundQuestions[overRoundIndex].roundQuestions.splice(
          overQuestionIndex,
          0,
          removedItem
        );
        setPackageData({ ...packageData, rounds: newRoundQuestions });
        handleAutoSaveQuestionsOrder(newRoundQuestions);
      }
    }

    if (
      active.id.toString().includes("question") &&
      over?.id.toString().includes("round") &&
      active &&
      over &&
      active.id !== over.id
    ) {
      const activeRound = findValueOfItems(active.id, "question");
      const overRound = findValueOfItems(over.id, "round");

      if (!activeRound || !overRound) return;

      const activeRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === activeRound.id
      );

      const overRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === overRound.id
      );

      const activeQuestionIndex = activeRound.roundQuestions.findIndex(
        (question) => question.id === active.id
      );

      let newRoundQuestions = [...packageData.rounds];
      const [removedQuestion] = newRoundQuestions[
        activeRoundIndex
      ].roundQuestions.splice(activeQuestionIndex, 1);
      newRoundQuestions[overRoundIndex].roundQuestions.push(removedQuestion);

      setPackageData({ ...packageData, rounds: newRoundQuestions });
      handleAutoSaveQuestionsOrder(newRoundQuestions);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (
      active.id.toString().includes("round") &&
      over?.id.toString().includes("round") &&
      active &&
      over
    ) {
      const activeRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === active.id
      );
      const overRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === over.id
      );

      let newRoundQuestions = [...packageData.rounds];
      newRoundQuestions = arrayMove(
        newRoundQuestions,
        activeRoundIndex,
        overRoundIndex
      );
      setPackageData({ ...packageData, rounds: newRoundQuestions });
      handleAutoSaveQuestionsOrder(newRoundQuestions);
    }

    if (
      active.id.toString().includes("question") &&
      over?.id.toString().includes("question") &&
      active &&
      over &&
      active.id !== over.id
    ) {
      const activeRound = findValueOfItems(active.id, "question");
      const overRound = findValueOfItems(over.id, "question");

      if (!activeRound || !overRound) return;
      const activeRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === activeRound.id
      );
      const overRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === overRound.id
      );
      const activeQuestionIndex = activeRound.roundQuestions.findIndex(
        (question) => question.id === active.id
      );
      const overQuestionIndex = overRound.roundQuestions.findIndex(
        (question) => question.id === over.id
      );

      if (activeRoundIndex === overRoundIndex) {
        let newRoundQuestions = [...packageData.rounds];
        newRoundQuestions[activeRoundIndex].roundQuestions = arrayMove(
          newRoundQuestions[activeRoundIndex].roundQuestions,
          activeQuestionIndex,
          overQuestionIndex
        );
        setPackageData({ ...packageData, rounds: newRoundQuestions });
        handleAutoSaveQuestionsOrder(newRoundQuestions);
      } else {
        let newRoundQuestions = [...packageData.rounds];
        const [removedQuestion] = newRoundQuestions[
          activeRoundIndex
        ].roundQuestions.splice(activeQuestionIndex, 1);
        newRoundQuestions[overQuestionIndex].roundQuestions.splice(
          overQuestionIndex,
          0,
          removedQuestion
        );

        setPackageData({ ...packageData, rounds: newRoundQuestions });
        handleAutoSaveQuestionsOrder(newRoundQuestions);
      }
    }

    if (
      active.id.toString().includes("question") &&
      over?.id.toString().includes("round") &&
      active &&
      over &&
      active.id !== over.id
    ) {
      const activeRound = findValueOfItems(active.id, "question");
      const overRound = findValueOfItems(over.id, "round");

      if (!activeRound || !overRound) return;

      const activeRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === activeRound.id
      );
      const overRoundIndex = packageData.rounds.findIndex(
        (round) => round.id === overRound.id
      );

      const activeQuestionIndex = activeRound.roundQuestions.findIndex(
        (question) => question.id === active.id
      );
      let newRoundQuestions = [...packageData.rounds];
      const [removedQuestion] = newRoundQuestions[
        activeRoundIndex
      ].roundQuestions.splice(activeQuestionIndex, 1);
      newRoundQuestions[overRoundIndex].roundQuestions.push(removedQuestion);
      setPackageData({ ...packageData, rounds: newRoundQuestions });
      handleAutoSaveQuestionsOrder(newRoundQuestions);
    }

    setActiveId(null);
  };

  const handleSearchDialogQuestionClick = (questionId: number) => {
    if (currentRoundId) {
      const round = packageData.rounds.find((r) => r.id === currentRoundId);
      if (round) {
        const roundId = Number(
          currentRoundId.toString().replace(/^round-/, "")
        );
        handleAddQuestion(roundId, questionId, round.questions.length);
      }
    }
  };

  const handleCreatingQuestionCancel: OnCreatingQuestionCancel = () =>
    setIsCreatingQuestion(false);

  const handleQuestionAdd: OnQuestionAdd = (roundId) => {
    setCurrentRoundId(roundId);
    setIsAddQuestionDialogOpen(true);
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b">
        <div className="container py-4">
          <div className="space-y-4">
            <Link href="/packages">
              <Button variant="ghost" className="pl-0">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Назад к пакетам
              </Button>
            </Link>
            {packageData && (
              <PackageEditorHeader
                packageData={packageData}
                onSave={handleUpdatePackage}
              />
            )}
          </div>
        </div>
      </div>

      <AutoSaveStatus saving={isSaving} />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <PackageEditorSidebar
          activeQuestionId={activeQuestionId}
          rounds={packageData.rounds}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragEnd={handleDragEnd}
          onQuestionClick={handleQuestionClick}
          onAddRound={handleAddRound}
        />
        <ResizableHandle />
        <PackageEditorContent
          questionRefs={questionRefs}
          rounds={packageData.rounds}
          activeQuestionId={activeQuestionId}
          currentRoundId={currentRoundId}
          isCreatingQuestion={isCreatingQuestion}
          handleUpdateRound={handleUpdateRound}
          handleAutoSave={handleAutoSave}
          handleCreateQuestion={handleCreateQuestion}
          handleDeleteQuestion={handleDeleteQuestion}
          onCreatingQuestionCancel={handleCreatingQuestionCancel}
          onQuestionAdd={handleQuestionAdd}
        />
      </ResizablePanelGroup>
      <AddQuestionDialog
        open={isAddQuestionDialogOpen}
        onOpenChange={setIsAddQuestionDialogOpen}
        onSelect={handleAddQuestionSelect}
      />
      <AddQuestionListDialog
        availableQuestions={availableQuestions}
        open={isSearchDialogOpen}
        handleSearch={handleSearch}
        onOpenChange={setIsSearchDialogOpen}
        onQuestionClick={handleSearchDialogQuestionClick}
      />
      <GenerateQuestionsDialog
        open={isGenerateQuestionsDialogOpen}
        onOpenChange={setIsGenerateQuestionsDialogOpen}
        onSubmit={handleGenerateQuestions}
      />
    </div>
  );
}
