import { eq, and } from "drizzle-orm";
import { db } from "@db";
import { packages, rounds, roundQuestions, packageQuestionVersions } from "@db/schema";
import type { Request, Response } from "express";

// ... other routes ...

// Add package-specific question version
export async function createPackageQuestionVersion(req: Request, res: Response) {
  const { packageId, questionId } = req.params;
  const { content, answer } = req.body;

  try {
    // Find the round_question_id for this package and question
    const [roundQuestion] = await db
      .select()
      .from(roundQuestions)
      .where(
        and(
          eq(roundQuestions.questionId, parseInt(questionId)),
          eq(rounds.packageId, parseInt(packageId))
        )
      )
      .leftJoin(rounds, eq(rounds.id, roundQuestions.roundId));

    if (!roundQuestion) {
      return res.status(404).json({ error: "Question not found in this package" });
    }

    // Create a new version
    const [version] = await db
      .insert(packageQuestionVersions)
      .values({
        roundQuestionId: roundQuestion.id,
        content,
        answer,
      })
      .returning();

    res.json(version);
  } catch (error) {
    console.error("Error creating package question version:", error);
    res.status(500).json({ error: "Failed to save question version" });
  }
}

// Add this route to your Express app setup
export function registerPackageRoutes(app: Express) {
  app.post(
    "/api/packages/:packageId/questions/:questionId/version",
    createPackageQuestionVersion
  );
}
