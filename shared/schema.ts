import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  real,
  timestamp,
  json,
  boolean,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { isValidTimeZone } from "./quietHours";

// Couples table - represents a linked couple with shared stats
// Status: pending (invite created), active (partner joined), archived (unpaired)
export const couples = pgTable("couples", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ritualCode: varchar("ritual_code", { length: 8 }).unique(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdByUserId: varchar("created_by_user_id"),
  expiresAt: timestamp("expires_at"),
  activatedAt: timestamp("activated_at"),
  archivedAt: timestamp("archived_at"),
  archivedByUserId: varchar("archived_by_user_id"),
  totalKm: real("total_km").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  lastWalkDate: timestamp("last_walk_date"),
  // Calendar day (YYYY-MM-DD) of the last walk in the walker's own timezone.
  lastWalkLocalDate: varchar("last_walk_local_date", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table - individual user accounts
export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nickname: varchar("nickname", { length: 50 }).notNull(),
  avatarUrl: text("avatar_url"),
  coupleId: varchar("couple_id").references(() => couples.id),
  // Login tokens issued before this moment are rejected (set on password reset).
  passwordChangedAt: timestamp("password_changed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Walks table - individual walking sessions
export const walks = pgTable("walks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  coupleId: varchar("couple_id").references(() => couples.id),
  distanceKm: real("distance_km").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  stepsTotal: integer("steps_total").default(0),
  pathJson:
    json("path_json").$type<{ latitude: number; longitude: number }[]>(),
  isActive: boolean("is_active").notNull().default(false),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  // Calendar day (YYYY-MM-DD) in the walker's timezone, used to rebuild the streak.
  localDate: varchar("local_date", { length: 10 }),
});

// Badges earned by a ritual (couple). Definitions live in shared/badges.ts; rows are never
// removed, so deleting a walk doesn't take a badge away.
export const coupleBadges = pgTable(
  "couple_badges",
  {
    coupleId: varchar("couple_id")
      .notNull()
      .references(() => couples.id),
    badgeKey: varchar("badge_key", { length: 40 }).notNull(),
    earnedAt: timestamp("earned_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.coupleId, table.badgeKey] })],
);

// Notification preferences - per-user notification settings
export const notificationPrefs = pgTable("notification_prefs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  notificationsEnabled: boolean("notifications_enabled")
    .notNull()
    .default(false),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  reminderTime: varchar("reminder_time", { length: 5 })
    .notNull()
    .default("18:00"),
  reminderDays: json("reminder_days")
    .$type<number[]>()
    .notNull()
    .default([1, 2, 3, 4, 5, 6, 7]),
  reminderMessage: text("reminder_message"),
  partnerAlertsEnabled: boolean("partner_alerts_enabled")
    .notNull()
    .default(true),
  // No longer used. Kept in the table so `db:push` doesn't stop to ask about deleting data.
  badgesEnabled: boolean("badges_enabled").notNull().default(true),
  weeklySummaryEnabled: boolean("weekly_summary_enabled")
    .notNull()
    .default(true),
  weeklySummaryDay: integer("weekly_summary_day").notNull().default(7),
  weeklySummaryTime: varchar("weekly_summary_time", { length: 5 })
    .notNull()
    .default("10:00"),
  quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
  quietStart: varchar("quiet_start", { length: 5 }).notNull().default("22:00"),
  quietEnd: varchar("quiet_end", { length: 5 }).notNull().default("08:00"),
  pushToken: text("push_token"),
  timeZone: varchar("time_zone", { length: 64 }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Failed logins and reset-code requests per key ("ip:..." or "email:...") in a fixed window.
export const authAttempts = pgTable("auth_attempts", {
  key: varchar("key", { length: 320 }).primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: timestamp("window_start").defaultNow().notNull(),
});

// One pending password-reset code per user, stored hashed.
export const passwordResets = pgTable("password_resets", {
  userId: varchar("user_id")
    .primaryKey()
    .references(() => users.id),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").notNull().default(0),
});

// Relations
export const couplesRelations = relations(couples, ({ many, one }) => ({
  users: many(users),
  walks: many(walks),
  createdBy: one(users, {
    fields: [couples.createdByUserId],
    references: [users.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  couple: one(couples, {
    fields: [users.coupleId],
    references: [couples.id],
  }),
  walks: many(walks),
}));

export const walksRelations = relations(walks, ({ one }) => ({
  user: one(users, {
    fields: [walks.userId],
    references: [users.id],
  }),
  couple: one(couples, {
    fields: [walks.coupleId],
    references: [couples.id],
  }),
}));

export const notificationPrefsRelations = relations(
  notificationPrefs,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPrefs.userId],
      references: [users.id],
    }),
  }),
);

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  nickname: true,
  avatarUrl: true,
});

export const insertCoupleSchema = createInsertSchema(couples).pick({
  ritualCode: true,
});

export const insertWalkSchema = createInsertSchema(walks).pick({
  userId: true,
  coupleId: true,
  distanceKm: true,
  durationSeconds: true,
  pathJson: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCouple = z.infer<typeof insertCoupleSchema>;
export type Couple = typeof couples.$inferSelect;
export type InsertWalk = z.infer<typeof insertWalkSchema>;
export type Walk = typeof walks.$inferSelect;
export type CoupleBadge = typeof coupleBadges.$inferSelect;
export type NotificationPrefs = typeof notificationPrefs.$inferSelect;
export type PasswordReset = typeof passwordResets.$inferSelect;

// Auth schemas
const emailField = z.string().trim().toLowerCase().email("Email non valida");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

export const registerSchema = z.object({
  email: emailField,
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
  nickname: z
    .string()
    .trim()
    .min(2, "Il nickname deve avere almeno 2 caratteri")
    .max(50),
});

const passwordField = z
  .string()
  .min(6, "La password deve avere almeno 6 caratteri");

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Inserisci la password"),
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  email: emailField,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Il codice è di 6 cifre"),
  password: passwordField,
});

export const joinCoupleSchema = z.object({
  ritualCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(6, "Il codice deve avere almeno 6 caratteri")
    .max(8),
});

const localDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");

export const endWalkSchema = z.object({
  distanceKm: z.number().finite().min(0).max(200),
  durationSeconds: z
    .number()
    .int()
    .min(0)
    .max(24 * 60 * 60),
  stepsTotal: z.number().int().min(0).max(500000).default(0),
  pathJson: z
    .array(
      z.object({
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }),
    )
    .max(5000)
    .default([]),
  localDate: localDateField,
});

export const badgesQuerySchema = z.object({ today: localDateField });

export const statsQuerySchema = z
  .object({
    startDate: z.string().datetime({ offset: true }),
    endDate: z.string().datetime({ offset: true }),
  })
  .refine((q) => new Date(q.startDate) <= new Date(q.endDate), {
    message: "Intervallo di date non valido",
  });

const timeField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Orario non valido");
const weekdayField = z.number().int().min(1).max(7);

export const notificationPrefsUpdateSchema = z
  .object({
    notificationsEnabled: z.boolean(),
    remindersEnabled: z.boolean(),
    reminderTime: timeField,
    reminderDays: z.array(weekdayField).max(7),
    reminderMessage: z.string().trim().max(200).nullable(),
    partnerAlertsEnabled: z.boolean(),
    weeklySummaryEnabled: z.boolean(),
    weeklySummaryDay: weekdayField,
    weeklySummaryTime: timeField,
    quietHoursEnabled: z.boolean(),
    quietStart: timeField,
    quietEnd: timeField,
    pushToken: z.string().max(500).nullable(),
    timeZone: z
      .string()
      .max(64)
      .refine(isValidTimeZone, "Fuso orario non valido")
      .nullable(),
  })
  .partial();
