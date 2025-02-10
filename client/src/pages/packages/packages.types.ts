import type { Package, Question } from "@db/schema";
import type { Round } from "@/pages/rounds/rounds.type";

export type PackageWithRounds = Omit<Package, "rounds"> & {
  rounds: Round[];
};

export type PackageQuestion = Question & {
  author: { username: string };
};
