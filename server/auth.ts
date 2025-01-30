import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type User } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";

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

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      role: string;
      password: string;
      createdAt: Date;
      updatedAt: Date;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "quiz-admin-secret",
    resave: false,
    saveUninitialized: false,
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: app.get("env") === "production",
      httpOnly: true,
      sameSite: "lax"
    }
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Неверное имя пользователя" });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Неверный пароль" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Create admin user if it doesn't exist
  app.use(async (req, res, next) => {
    try {
      const [adminUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, "admin"))
        .limit(1);

      if (!adminUser) {
        const hashedPassword = await crypto.hash("admin");
        await db.insert(users).values({
          username: "admin",
          password: hashedPassword,
          role: "admin",
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  });

  // Auth routes
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Check if user is authenticated and has admin role
      if (!req.isAuthenticated() || req.user.role !== "admin") {
        return res.status(403).send("Только администраторы могут создавать новых пользователей");
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).send("Пользователь с таким именем уже существует");
      }

      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          role: req.body.role || "author",
        })
        .returning();

      res.json({
        message: "Пользователь успешно создан",
        user: { id: newUser.id, username: newUser.username, role: newUser.role },
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Ошибка входа");
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        return res.json({
          message: "Вход выполнен успешно",
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
          },
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).send("Ошибка выхода");
      }
      res.json({ message: "Выход выполнен успешно" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Не авторизован");
  });
}