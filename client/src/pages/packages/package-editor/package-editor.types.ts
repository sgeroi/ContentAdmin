import type { QuestionFormData } from ".";

export type HandleUpdateRound = (
  id: number,
  data: {
    name: string;
    description: string;
  }
) => Promise<void>;

export type HandleAutoSave = (
  questionId: number,
  data: Partial<QuestionFormData>
) => Promise<void>;

export type HandleCreateQuestion = (data: {
  content: any;
  answer: string;
  difficulty: number;
}) => void;

export type HandleDeleteQuestion = (
  roundId: number | string,
  questionId: number
) => Promise<void>;

export type OnCreatingQuestionCancel = () => void;

export type OnQuestionAdd = (roundId: number) => void;
