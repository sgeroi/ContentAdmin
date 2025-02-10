import { PackageQuestion } from "@/pages/packages/packages.types";

export type RoundQuestion = {
  id: number;
  roundId: number;
  questionId: number;
  orderIndex: number;
  question: PackageQuestion;
};

export type Round = {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  questions: PackageQuestion[];
  orderIndex: number;
  roundQuestions: RoundQuestion[];
};
