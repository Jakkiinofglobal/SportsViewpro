import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User accounts with subscription plans
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  plan: text("plan").notNull().default("demo"),
  selectedSport: text("selected_sport"),
  purchasedSport: text("purchased_sport"),
  subscriptionId: text("subscription_id"),
  subscriptionStatus: text("subscription_status"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Payment transactions (PayPal orders)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  paypalOrderId: text("paypal_order_id"),
  paypalSubscriptionId: text("paypal_subscription_id"),
  plan: text("plan").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Admin actions (refunds, free months, bans)
export const adminActions = pgTable("admin_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  adminEmail: text("admin_email").notNull(),
  action: text("action").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertAdminActionSchema = createInsertSchema(adminActions).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertAdminAction = z.infer<typeof insertAdminActionSchema>;
export type AdminAction = typeof adminActions.$inferSelect;

// Plan types and pricing
export const PLANS = {
  demo: {
    id: "demo",
    name: "Demo (Free)",
    price: 0,
    sports: 1,
    clipsTotal: 1,
    hotkeys: { home: 1, away: 1, points: [2, 3] },
    export: false,
    playerImages: false,
    shotCharts: false,
  },
  studioMonthly: {
    id: "studioMonthly",
    name: "Studio Monthly",
    price: 28.99,
    sports: 1,
    clipsTotal: 2,
    hotkeys: { home: 5, away: 5, points: [1, 2, 3] },
    export: "basic",
    playerImages: false,
    shotCharts: false,
  },
  plusMonthly: {
    id: "plusMonthly",
    name: "Plus Monthly (Pro)",
    price: 39.99,
    sports: "all",
    clipsTotal: 10,
    hotkeys: { home: 10, away: 10, points: [1, 2, 3] },
    export: "full",
    playerImages: false,
    shotCharts: true,
  },
  creatorYearly: {
    id: "creatorYearly",
    name: "Creator Yearly",
    price: 198.97,
    sports: "all",
    clipsTotal: 10,
    hotkeys: { home: 10, away: 10, points: [1, 2, 3] },
    export: "full",
    playerImages: true,
    shotCharts: true,
  },
  proOneTime: {
    id: "proOneTime",
    name: "SportSight Pro Studio",
    price: 349.99,
    sports: "all",
    clipsTotal: 10,
    hotkeys: { home: 10, away: 10, points: [1, 2, 3] },
    export: "full",
    playerImages: true,
    shotCharts: true,
  },
} as const;

export type PlanId = keyof typeof PLANS;
