import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { questions, packages, tags, questionTags } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm"; 
import { validateQuestion, factCheckQuestion, generateQuizQuestions } from './services/openai';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';

// Настройка multer для загрузки изображений
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Неподдерживаемый формат файла'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Middleware to check if user is authenticated
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) return next();
    res.status(401).send("Unauthorized");
  };

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.role === "admin") return next();
    res.status(403).send("Forbidden");
  };

  // Static route for serving uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Upload image endpoint
  app.post("/api/upload", requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  // Tags API
  app.get("/api/tags", requireAuth, async (req, res) => {
    const result = await db.query.tags.findMany({
      orderBy: desc(tags.name),
    });
    res.json(result);
  });

  app.post("/api/tags", requireAuth, async (req, res) => {
    try {
      const [tag] = await db
        .insert(tags)
        .values({
          name: req.body.name,
        })
        .returning();
      res.json(tag);
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        res.status(400).send("Тег с таким именем уже существует");
      } else {
        res.status(500).send(error.message);
      }
    }
  });

  app.put("/api/tags/:id", requireAuth, async (req, res) => {
    try {
      const [tag] = await db
        .update(tags)
        .set({
          name: req.body.name,
          updatedAt: new Date(),
        })
        .where(eq(tags.id, parseInt(req.params.id)))
        .returning();
      res.json(tag);
    } catch (error: any) {
      if (error.code === '23505') {
        res.status(400).send("Тег с таким именем уже существует");
      } else {
        res.status(500).send(error.message);
      }
    }
  });

  app.delete("/api/tags/:id", requireAuth, async (req, res) => {
    await db
      .delete(tags)
      .where(eq(tags.id, parseInt(req.params.id)));
    res.json({ success: true });
  });

  // Questions API
  app.get("/api/questions", requireAuth, async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const [result, total] = await Promise.all([
      db.query.questions.findMany({
        with: {
          author: true,
          questionTags: {
            with: {
              tag: true
            }
          }
        },
        orderBy: desc(questions.createdAt),
        limit,
        offset,
      }),
      db.select({ count: sql<number>`count(*)` }).from(questions),
    ]);

    res.json({
      questions: result,
      total: total[0].count,
      page,
      limit,
    });
  });

  app.post("/api/questions/validate", requireAuth, async (req, res) => {
    try {
      const { title, content, topic } = req.body;
      const validation = await validateQuestion(title, content, topic);
      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/questions/factcheck", requireAuth, async (req, res) => {
    try {
      const { title, content, topic } = req.body;
      const validation = await factCheckQuestion(title, content, topic);

      // Update the question's fact-check status
      if (req.body.id) {
        await db
          .update(questions)
          .set({
            factChecked: true,
            factCheckDate: new Date(),
          })
          .where(eq(questions.id, req.body.id));
      }

      res.json(validation);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/questions", requireAuth, async (req, res) => {
    try {
      // Validate the question first
      const validation = await validateQuestion(
        req.body.title,
        req.body.content,
        req.body.topic
      );

      if (!validation.isValid) {
        return res.status(400).json({
          message: "Question validation failed",
          validation
        });
      }

      const [question] = await db
        .insert(questions)
        .values({
          ...req.body,
          authorId: (req.user as any).id,
        })
        .returning();
      res.json(question);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
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
          eq(questions.authorId, (req.user as any).id)
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
          eq(questions.authorId, (req.user as any).id)
        )
      );
    res.json({ success: true });
  });

  app.post("/api/questions/generate", requireAuth, async (req, res) => {
    try {
      const count = req.body.count || 10;
      const topic = req.body.topic;
      const generatedQuestions = await generateQuizQuestions(count, topic);

      // Create all questions at once with proper type casting
      const questionsToInsert = generatedQuestions.map(q => ({
        title: q.title,
        content: q.content,
        answer: q.answer,
        topic: q.topic,
        difficulty: q.difficulty,
        authorId: (req.user as any).id,
        factChecked: false,
        isGenerated: true
      }));

      const createdQuestions = await db
        .insert(questions)
        .values(questionsToInsert)
        .returning();

      res.json(createdQuestions);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}