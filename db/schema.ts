import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "editor", "author"] }).default("author").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: json("content").notNull(),
  answer: text("answer"),
  difficulty: integer("difficulty").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  factChecked: boolean("fact_checked").default(false),
  factCheckDate: timestamp("fact_check_date"),
  isGenerated: boolean("is_generated").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const questionTags = pgTable("question_tags", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  tagId: integer("tag_id").references(() => tags.id, { onDelete: 'cascade' }).notNull(),
});

export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rounds = pgTable("rounds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  templateId: integer("template_id").references(() => templates.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const packages = pgTable("packages", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  templateId: integer("template_id").references(() => templates.id).notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const packageRounds = pgTable("package_rounds", {
  id: serial("id").primaryKey(),
  packageId: integer("package_id").references(() => packages.id, { onDelete: 'cascade' }).notNull(),
  roundId: integer("round_id").references(() => rounds.id, { onDelete: 'cascade' }).notNull(),
  orderIndex: integer("order_index").notNull(),
});

export const roundQuestions = pgTable("round_questions", {
  id: serial("id").primaryKey(),
  roundId: integer("round_id").references(() => rounds.id, { onDelete: 'cascade' }).notNull(),
  questionId: integer("question_id").references(() => questions.id, { onDelete: 'cascade' }).notNull(),
  orderIndex: integer("order_index").notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  questions: many(questions),
  packages: many(packages),
  templates: many(templates),
}));

export const questionsRelations = relations(questions, ({ one, many }) => ({
  author: one(users, {
    fields: [questions.authorId],
    references: [users.id],
  }),
  questionTags: many(questionTags),
  roundQuestions: many(roundQuestions),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  questionTags: many(questionTags),
}));

export const questionTagsRelations = relations(questionTags, ({ one }) => ({
  question: one(questions, {
    fields: [questionTags.questionId],
    references: [questions.id],
  }),
  tag: one(tags, {
    fields: [questionTags.tagId],
    references: [tags.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  author: one(users, {
    fields: [templates.authorId],
    references: [users.id],
  }),
  rounds: many(rounds),
  packages: many(packages),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  template: one(templates, {
    fields: [rounds.templateId],
    references: [templates.id],
  }),
  packageRounds: many(packageRounds),
  roundQuestions: many(roundQuestions),
}));

export const packagesRelations = relations(packages, ({ one, many }) => ({
  template: one(templates, {
    fields: [packages.templateId],
    references: [templates.id],
  }),
  author: one(users, {
    fields: [packages.authorId],
    references: [users.id],
  }),
  packageRounds: many(packageRounds),
}));

export const packageRoundsRelations = relations(packageRounds, ({ one }) => ({
  package: one(packages, {
    fields: [packageRounds.packageId],
    references: [packages.id],
  }),
  round: one(rounds, {
    fields: [packageRounds.roundId],
    references: [rounds.id],
  }),
}));

export const roundQuestionsRelations = relations(roundQuestions, ({ one }) => ({
  round: one(rounds, {
    fields: [roundQuestions.roundId],
    references: [rounds.id],
  }),
  question: one(questions, {
    fields: [roundQuestions.questionId],
    references: [questions.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertQuestionSchema = createInsertSchema(questions);
export const selectQuestionSchema = createSelectSchema(questions);
export const insertTagSchema = createInsertSchema(tags);
export const selectTagSchema = createSelectSchema(tags);
export const insertTemplateSchema = createInsertSchema(templates);
export const selectTemplateSchema = createSelectSchema(templates);
export const insertRoundSchema = createInsertSchema(rounds);
export const selectRoundSchema = createSelectSchema(rounds);
export const insertPackageSchema = createInsertSchema(packages);
export const selectPackageSchema = createSelectSchema(packages);

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect & { 
  author?: User;
  tags?: Tag[];
};
export type InsertQuestion = typeof questions.$inferInsert;
export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;
export type Template = typeof templates.$inferSelect & {
  author?: User;
  rounds?: Round[];
};
export type InsertTemplate = typeof templates.$inferInsert;
export type Round = typeof rounds.$inferSelect & {
  questions?: Question[];
};
export type InsertRound = typeof rounds.$inferInsert;
export type Package = typeof packages.$inferSelect & {
  template?: Template;
  author?: User;
  rounds?: (Round & { questions?: Question[] })[];
};
export type InsertPackage = typeof packages.$inferInsert;