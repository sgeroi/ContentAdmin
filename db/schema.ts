import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "editor", "author"] }).default("author").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: json("content").notNull(), // Tiptap JSON content
  topic: text("topic").notNull(),
  difficulty: integer("difficulty").notNull(), // 1-5
  authorId: integer("author_id").references(() => users.id).notNull(),
  factChecked: boolean("fact_checked").default(false),
  factCheckDate: timestamp("fact_check_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const packageQuestions = pgTable("package_questions", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => packages.id, { onDelete: 'cascade' }).notNull(),
  questionId: integer("question_id").references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  packages: many(packages),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  author: one(users, {
    fields: [questions.authorId],
    references: [users.id],
  }),
  packageQuestions: many(packageQuestions),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  author: one(users, {
    fields: [packages.authorId],
    references: [users.id],
  }),
  packageQuestions: many(packageQuestions),
}));

export const packageQuestionsRelations = relations(packageQuestions, ({ one }) => ({
  package: one(packages, {
    fields: [packageQuestions.packageId],
    references: [packages.id],
  }),
  question: one(questions, {
    fields: [packageQuestions.questionId],
    references: [questions.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertQuestionSchema = createInsertSchema(questions);
export const selectQuestionSchema = createSelectSchema(questions);
export const insertPackageSchema = createInsertSchema(packages);
export const selectPackageSchema = createSelectSchema(packages);
export const insertPackageQuestionSchema = createInsertSchema(packageQuestions);
export const selectPackageQuestionSchema = createSelectSchema(packageQuestions);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect & { author?: User };
export type InsertQuestion = typeof questions.$inferInsert;
export type Package = typeof packages.$inferSelect & {
  packageQuestions?: (typeof packageQuestions.$inferSelect & {
    question?: Question;
  })[];
  author?: User;
};
export type InsertPackage = typeof packages.$inferInsert;
export type PackageQuestion = typeof packageQuestions.$inferSelect;
export type InsertPackageQuestion = typeof packageQuestions.$inferInsert;