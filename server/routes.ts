import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { questions, packages, tags, questionTags, users, rounds, templates, templateRoundSettings } from "@db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { validateQuestion, factCheckQuestion, generateQuizQuestions } from './services/openai';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

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
    res.status(401).json({ error: "Unauthorized" });
  };

  // Admin middleware
  const requireAdmin = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user.role === "admin") return next();
    res.status(403).send("Forbidden");
  };

  // Static route for serving uploaded files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // User management routes (admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    const result = await db.query.users.findMany({
      orderBy: desc(users.createdAt),
    });
    res.json(result);
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const { username, password, role } = req.body;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Пользователь с таким именем уже существует");
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          role,
        })
        .returning();

      res.json({ id: newUser.id, username: newUser.username, role: newUser.role });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const { username, password, role } = req.body;
      const userId = parseInt(req.params.id);

      // Check if username is taken by another user
      if (username) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.username, username),
            sql`${users.id} != ${userId}`
          ))
          .limit(1);

        if (existingUser) {
          return res.status(400).send("Пользователь с таким именем уже существует");
        }
      }

      const updateData: any = {
        ...(username && { username }),
        ...(role && { role }),
        updatedAt: new Date(),
      };

      // Only update password if it's provided
      if (password) {
        updateData.password = await crypto.hash(password);
      }

      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Prevent deleting the last admin
      const [adminCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "admin"));

      if (adminCount.count === 1) {
        const [userToDelete] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (userToDelete?.role === "admin") {
          return res.status(400).send("Невозможно удалить последнего администратора");
        }
      }

      await db
        .delete(users)
        .where(eq(users.id, userId));

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Package management routes
  app.get("/api/packages", requireAuth, async (req, res) => {
    try {
      const result = await db.query.packages.findMany({
        with: {
          template: true,
          rounds: true,
        },
        orderBy: desc(packages.createdAt),
      });
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching packages:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/packages", requireAuth, async (req, res) => {
    try {
      console.log('Creating package with data:', req.body);

      // First create the package
      const [pkg] = await db
        .insert(packages)
        .values({
          title: req.body.title,
          description: req.body.description || "",
          templateId: req.body.templateId || null,
          authorId: (req.user as any).id,
        })
        .returning();

      console.log('Package created:', pkg);

      // If manual rounds were provided, add them
      if (req.body.rounds && Array.isArray(req.body.rounds)) {
        for (const round of req.body.rounds) {
          await db.insert(rounds).values({
            name: round.name,
            description: round.description || "",
            questionCount: round.questionCount,
            orderIndex: round.orderIndex,
            packageId: pkg.id,
          });
        }
      }

      // Fetch the complete package with related data
      const [result] = await db.query.packages.findMany({
        where: eq(packages.id, pkg.id),
        with: {
          template: true,
          rounds: true,
        },
        limit: 1,
      });

      res.json(result);
    } catch (error: any) {
      console.error('Error creating package:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/packages/:id", requireAuth, async (req, res) => {
    try {
      await db.delete(packages).where(eq(packages.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting package:', error);
      res.status(500).json({ error: error.message });
    }
  });

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

  // Rounds API
  app.get("/api/rounds", requireAuth, async (req, res) => {
    try {
      const result = await db.query.rounds.findMany({
        orderBy: desc(rounds.orderIndex),
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.post("/api/rounds", requireAuth, async (req, res) => {
    try {
      const [round] = await db
        .insert(rounds)
        .values({
          name: req.body.name,
          description: req.body.description,
          questionCount: req.body.questionCount,
          orderIndex: req.body.orderIndex,
          templateId: req.body.templateId || null,
        })
        .returning();
      res.json(round);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.put("/api/rounds/:id", requireAuth, async (req, res) => {
    try {
      const [round] = await db
        .update(rounds)
        .set({
          name: req.body.name,
          description: req.body.description,
          questionCount: req.body.questionCount,
          orderIndex: req.body.orderIndex,
          updatedAt: new Date(),
        })
        .where(eq(rounds.id, parseInt(req.params.id)))
        .returning();
      res.json(round);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  app.delete("/api/rounds/:id", requireAuth, async (req, res) => {
    try {
      await db
        .delete(rounds)
        .where(eq(rounds.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });


  // Template management routes
  app.get("/api/templates", requireAuth, async (req, res) => {
    try {
      console.log('Fetching templates');
      const result = await db.query.templates.findMany({
        with: {
          roundSettings: {
            with: {
              round: true
            }
          }
        },
        orderBy: desc(templates.createdAt),
      });
      console.log('Templates fetched:', result);
      res.json(result);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      console.log('Creating template with data:', req.body);

      if (!req.body.name) {
        return res.status(400).json({ error: "Template name is required" });
      }

      const [template] = await db
        .insert(templates)
        .values({
          name: req.body.name,
          description: req.body.description || "",
          authorId: (req.user as any).id,
        })
        .returning();

      console.log('Template created:', template);
      res.json(template);
    } catch (error: any) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/templates/:templateId/rounds", requireAuth, async (req, res) => {
    try {
      console.log('Adding round to template:', {
        templateId: req.params.templateId,
        roundData: req.body
      });

      if (!req.body.roundId) {
        return res.status(400).json({ error: "Round ID is required" });
      }

      const [setting] = await db
        .insert(templateRoundSettings)
        .values({
          templateId: parseInt(req.params.templateId),
          roundId: req.body.roundId,
          name: req.body.name || "",
          description: req.body.description || "",
          questionCount: req.body.questionCount || 0,
          editorNotes: req.body.editorNotes || "",
          orderIndex: req.body.orderIndex || 0,
        })
        .returning();

      console.log('Round setting created:', setting);
      res.json(setting);
    } catch (error: any) {
      console.error('Error adding round to template:', error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}