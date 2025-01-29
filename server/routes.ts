import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { questions, packages, packageQuestions } from "@db/schema";
import { eq, and, desc } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).send("Unauthorized");
  };

  // Questions API
  app.get("/api/questions", requireAuth, async (req, res) => {
    const result = await db.query.questions.findMany({
      with: {
        author: true,
      },
      orderBy: desc(questions.createdAt),
    });
    res.json(result);
  });

  app.post("/api/questions", requireAuth, async (req, res) => {
    const [question] = await db
      .insert(questions)
      .values({
        ...req.body,
        authorId: req.user!.id,
      })
      .returning();
    res.json(question);
  });

  app.put("/api/questions/:id", requireAuth, async (req, res) => {
    const [question] = await db
      .update(questions)
      .set({
        ...req.body,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(questions.id, parseInt(req.params.id)),
          eq(questions.authorId, req.user!.id)
        )
      )
      .returning();
    res.json(question);
  });

  app.delete("/api/questions/:id", requireAuth, async (req, res) => {
    await db
      .delete(questions)
      .where(
        and(
          eq(questions.id, parseInt(req.params.id)),
          eq(questions.authorId, req.user!.id)
        )
      );
    res.json({ success: true });
  });

  // Packages API
  app.get("/api/packages", requireAuth, async (req, res) => {
    const result = await db.query.packages.findMany({
      with: {
        author: true,
        questions: {
          with: {
            question: true,
          },
        },
      },
      orderBy: desc(packages.createdAt),
    });
    res.json(result);
  });

  app.post("/api/packages", requireAuth, async (req, res) => {
    const { title, description, questions: packageQuestionsList } = req.body;

    const [pkg] = await db
      .insert(packages)
      .values({
        title,
        description,
        authorId: req.user!.id,
      })
      .returning();

    if (packageQuestionsList?.length) {
      await db.insert(packageQuestions).values(
        packageQuestionsList.map((q: any, index: number) => ({
          packageId: pkg.id,
          questionId: q.id,
          orderIndex: index,
        }))
      );
    }

    res.json(pkg);
  });

  app.put("/api/packages/:id", requireAuth, async (req, res) => {
    const { title, description, questions: packageQuestionsList } = req.body;

    const [pkg] = await db
      .update(packages)
      .set({
        title,
        description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(packages.id, parseInt(req.params.id)),
          eq(packages.authorId, req.user!.id)
        )
      )
      .returning();

    // Update package questions
    await db
      .delete(packageQuestions)
      .where(eq(packageQuestions.packageId, pkg.id));

    if (packageQuestionsList?.length) {
      await db.insert(packageQuestions).values(
        packageQuestionsList.map((q: any, index: number) => ({
          packageId: pkg.id,
          questionId: q.id,
          orderIndex: index,
        }))
      );
    }

    res.json(pkg);
  });

  app.delete("/api/packages/:id", requireAuth, async (req, res) => {
    await db
      .delete(packages)
      .where(
        and(
          eq(packages.id, parseInt(req.params.id)),
          eq(packages.authorId, req.user!.id)
        )
      );
    res.json({ success: true });
  });

  const httpServer = createServer(app);
  return httpServer;
}
