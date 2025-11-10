import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Simple username/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(), // Will be hashed
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  matriculation: varchar("matriculation").unique(),
  department: varchar("department"),
  role: varchar("role").notNull().default("user"), // 'admin', 'operator', 'user'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Tool Classes (e.g., Chaves, Micrômetros, Paquímetros, Alicates)
export const toolClasses = pgTable("tool_classes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertToolClassSchema = createInsertSchema(toolClasses).omit({
  id: true,
  createdAt: true,
});

export type InsertToolClass = z.infer<typeof insertToolClassSchema>;
export type ToolClass = typeof toolClasses.$inferSelect;

// Tool Models (Normal or Calibration)
export const toolModels = pgTable("tool_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(), // "Normal" or "Calibração"
  requiresCalibration: boolean("requires_calibration").notNull().default(false),
  calibrationIntervalDays: integer("calibration_interval_days"), // e.g., 100, 300 days
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertToolModelSchema = createInsertSchema(toolModels).omit({
  id: true,
  createdAt: true,
});

export type InsertToolModel = z.infer<typeof insertToolModelSchema>;
export type ToolModel = typeof toolModels.$inferSelect;

// Tools
export const tools = pgTable("tools", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  code: varchar("code").notNull().unique(), // Unique identification code
  classId: varchar("class_id").references(() => toolClasses.id),
  modelId: varchar("model_id").references(() => toolModels.id),
  quantity: integer("quantity").notNull().default(1),
  availableQuantity: integer("available_quantity").notNull().default(1),
  status: varchar("status").notNull().default("available"), // 'available', 'loaned', 'calibration', 'out_of_service'
  lastCalibrationDate: timestamp("last_calibration_date"),
  nextCalibrationDate: timestamp("next_calibration_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const toolsRelations = relations(tools, ({ one, many }) => ({
  class: one(toolClasses, {
    fields: [tools.classId],
    references: [toolClasses.id],
  }),
  model: one(toolModels, {
    fields: [tools.modelId],
    references: [toolModels.id],
  }),
  loans: many(loans),
}));

export const insertToolSchema = createInsertSchema(tools).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  availableQuantity: true,
});

export type InsertTool = z.infer<typeof insertToolSchema>;
export type Tool = typeof tools.$inferSelect;

// Loans (Empréstimos)
export const loans = pgTable("loans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id").notNull().references(() => tools.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  operatorId: varchar("operator_id").notNull().references(() => users.id), // Who registered the loan
  quantityLoaned: integer("quantity_loaned").notNull().default(1),
  loanDate: timestamp("loan_date").notNull().defaultNow(),
  expectedReturnDate: timestamp("expected_return_date"),
  returnDate: timestamp("return_date"),
  status: varchar("status").notNull().default("active"), // 'active', 'returned', 'overdue'
  userConfirmation: boolean("user_confirmation").notNull().default(false),
  userConfirmationDate: timestamp("user_confirmation_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loansRelations = relations(loans, ({ one }) => ({
  tool: one(tools, {
    fields: [loans.toolId],
    references: [tools.id],
  }),
  user: one(users, {
    fields: [loans.userId],
    references: [users.id],
  }),
  operator: one(users, {
    fields: [loans.operatorId],
    references: [users.id],
  }),
}));

export const insertLoanSchema = createInsertSchema(loans).omit({
  id: true,
  createdAt: true,
  loanDate: true,
  status: true,
});

export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loans.$inferSelect;

// Calibration Alerts
export const calibrationAlerts = pgTable("calibration_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  toolId: varchar("tool_id").notNull().references(() => tools.id),
  alertDate: timestamp("alert_date").notNull().defaultNow(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status").notNull().default("pending"), // 'pending', 'acknowledged', 'completed'
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  acknowledgedAt: timestamp("acknowledged_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const calibrationAlertsRelations = relations(calibrationAlerts, ({ one }) => ({
  tool: one(tools, {
    fields: [calibrationAlerts.toolId],
    references: [tools.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [calibrationAlerts.acknowledgedBy],
    references: [users.id],
  }),
}));

export type CalibrationAlert = typeof calibrationAlerts.$inferSelect;

// Tool Class Relations
export const toolClassesRelations = relations(toolClasses, ({ many }) => ({
  tools: many(tools),
}));

// Tool Model Relations
export const toolModelsRelations = relations(toolModels, ({ many }) => ({
  tools: many(tools),
}));

// User Relations
export const usersRelations = relations(users, ({ many }) => ({
  loansAsUser: many(loans, { relationName: "userLoans" }),
  loansAsOperator: many(loans, { relationName: "operatorLoans" }),
}));
