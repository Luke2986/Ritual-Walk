import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, timestamp, json, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Walks table - individual walking sessions
export const walks = pgTable("walks", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  coupleId: varchar("couple_id").references(() => couples.id),
  distanceKm: real("distance_km").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  stepsTotal: integer("steps_total").default(0),
  pathJson: json("path_json").$type<{ latitude: number; longitude: number }[]>(),
  isActive: boolean("is_active").notNull().default(false),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
});

// Badges table - achievement badges
export const badges = pgTable("badges", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 50 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 30 }).notNull(),
  kmThreshold: real("km_threshold"),
  streakThreshold: integer("streak_threshold"),
  walkCountThreshold: integer("walk_count_threshold"),
  orderIndex: integer("order_index").notNull().default(0),
});

// User badges - tracks which badges each user has earned
export const userBadges = pgTable("user_badges", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

// Notification preferences - per-user notification settings
export const notificationPrefs = pgTable("notification_prefs", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(false),
  remindersEnabled: boolean("reminders_enabled").notNull().default(true),
  reminderTime: varchar("reminder_time", { length: 5 }).notNull().default("18:00"),
  reminderDays: json("reminder_days").$type<number[]>().notNull().default([1, 2, 3, 4, 5, 6, 7]),
  reminderMessage: text("reminder_message"),
  partnerAlertsEnabled: boolean("partner_alerts_enabled").notNull().default(true),
  badgesEnabled: boolean("badges_enabled").notNull().default(true),
  weeklySummaryEnabled: boolean("weekly_summary_enabled").notNull().default(true),
  weeklySummaryDay: integer("weekly_summary_day").notNull().default(7),
  weeklySummaryTime: varchar("weekly_summary_time", { length: 5 }).notNull().default("10:00"),
  quietHoursEnabled: boolean("quiet_hours_enabled").notNull().default(false),
  quietStart: varchar("quiet_start", { length: 5 }).notNull().default("22:00"),
  quietEnd: varchar("quiet_end", { length: 5 }).notNull().default("08:00"),
  pushToken: text("push_token"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
  badges: many(userBadges),
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

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const notificationPrefsRelations = relations(notificationPrefs, ({ one }) => ({
  user: one(users, {
    fields: [notificationPrefs.userId],
    references: [users.id],
  }),
}));

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

export const insertBadgeSchema = createInsertSchema(badges).pick({
  name: true,
  description: true,
  icon: true,
  kmThreshold: true,
  streakThreshold: true,
  walkCountThreshold: true,
  orderIndex: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertCouple = z.infer<typeof insertCoupleSchema>;
export type Couple = typeof couples.$inferSelect;
export type InsertWalk = z.infer<typeof insertWalkSchema>;
export type Walk = typeof walks.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type UserBadge = typeof userBadges.$inferSelect;
export type NotificationPrefs = typeof notificationPrefs.$inferSelect;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
});

export const registerSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(6, "La password deve avere almeno 6 caratteri"),
  nickname: z.string().min(2, "Il nickname deve avere almeno 2 caratteri").max(50),
});

export const joinCoupleSchema = z.object({
  ritualCode: z.string().min(6, "Il codice deve avere almeno 6 caratteri").max(8),
});
