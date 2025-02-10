import { Round } from "@/pages/rounds/rounds.type";
import { PackageWithRounds } from "@/pages/packages/packages.types";

export const transformPackages = (rounds: Round[]) => {
  return rounds.map((round: Round) => {
    return {
      ...round,
      id: `round-${round.id}`,
      roundQuestions: round.roundQuestions.map((question) => ({
        ...question,
        id: `question-${question.id}`,
      })),
    };
  });
};

export const removePrefixes = (rounds: Round[]) => {
  return rounds.map((round) => {
    const newRoundId = round.id.toString().replace(/^round-/, "");

    const newRoundQuestions = round.roundQuestions.map((question) => ({
      ...question,
      id: question.id.toString().replace(/^question-/, ""),
    }));

    return {
      ...round,
      id: newRoundId,
      roundQuestions: newRoundQuestions,
    };
  });
};

export const orderRounds = (rounds: Round[]) => {
  return rounds.map((round) => {
    return {
      ...round,
      roundQuestions: round.roundQuestions.map((roundQuestion, index) => ({
        ...roundQuestion,
        orderIndex: index,
      })),
    };
  });
};
