import {
  users,
  couples,
  walks,
  notificationPrefs,
  userBadges,
  authAttempts,
  passwordResets,
  type User,
  type InsertUser,
  type Couple,
  type Walk,
  type NotificationPrefs,
  type PasswordReset,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gt, gte, lte, inArray, count } from "drizzle-orm";
import {
  applyWalkToStreak,
  lastWalkLocalDateOf,
  streakFromLocalDates,
} from "./streak";

export type JoinResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "CODE_ALREADY_USED"
        | "CODE_EXPIRED"
        | "INVITE_NO_LONGER_VALID"
        | "USER_ALREADY_PAIRED"
        | "CANNOT_PAIR_WITH_SELF";
    };

export type EndWalkResult =
  | { ok: true; walk: Walk }
  | { ok: false; code: "NOT_FOUND" | "FORBIDDEN" | "ALREADY_ENDED" };

export interface EndWalkData {
  distanceKm: number;
  durationSeconds: number;
  stepsTotal: number;
  pathJson: { latitude: number; longitude: number }[];
  localDate: string;
}

const completedWalk = and(eq(walks.isActive, false), gt(walks.distanceKm, 0));

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Totals and streak are derived from the couple's walks, so they can be rebuilt after a delete.
async function rebuildCoupleStats(tx: Tx, coupleId: string) {
  const [couple] = await tx
    .select({ id: couples.id })
    .from(couples)
    .where(eq(couples.id, coupleId))
    .for("update");
  if (!couple) return;

  const rows = await tx
    .select({
      distanceKm: walks.distanceKm,
      localDate: walks.localDate,
      startedAt: walks.startedAt,
      endedAt: walks.endedAt,
    })
    .from(walks)
    .where(and(eq(walks.coupleId, coupleId), completedWalk));

  const streak = streakFromLocalDates(
    rows.map((w) => w.localDate ?? w.startedAt.toISOString().slice(0, 10)),
  );
  const lastWalkDate = rows.reduce<Date | null>((latest, w) => {
    const at = w.endedAt ?? w.startedAt;
    return !latest || at > latest ? at : latest;
  }, null);

  await tx
    .update(couples)
    .set({
      totalKm: rows.reduce((sum, w) => sum + w.distanceKm, 0),
      currentStreak: streak.currentStreak,
      bestStreak: sql`greatest(${couples.bestStreak}, ${streak.currentStreak})`,
      lastWalkLocalDate: streak.lastLocalDate,
      lastWalkDate,
    })
    .where(eq(couples.id, coupleId));
}

export class DatabaseStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(sql`lower(${users.email})`, email.toLowerCase()));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getCouple(id: string): Promise<Couple | undefined> {
    const [couple] = await db.select().from(couples).where(eq(couples.id, id));
    return couple;
  }

  async getCoupleByRitualCode(ritualCode: string): Promise<Couple | undefined> {
    const [couple] = await db
      .select()
      .from(couples)
      .where(eq(couples.ritualCode, ritualCode));
    return couple;
  }

  async createCoupleWithInvite(
    ritualCode: string,
    createdByUserId: string,
    expiresAt: Date,
  ): Promise<Couple> {
    const [couple] = await db
      .insert(couples)
      .values({ ritualCode, status: "pending", createdByUserId, expiresAt })
      .returning();
    return couple;
  }

  async updateCouple(
    id: string,
    data: Partial<Couple>,
  ): Promise<Couple | undefined> {
    const [couple] = await db
      .update(couples)
      .set(data)
      .where(eq(couples.id, id))
      .returning();
    return couple;
  }

  async getCoupleUsers(coupleId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.coupleId, coupleId));
  }

  async joinCoupleTransaction(
    coupleId: string,
    userId: string,
  ): Promise<JoinResult> {
    return db.transaction(async (tx): Promise<JoinResult> => {
      const [couple] = await tx
        .select()
        .from(couples)
        .where(eq(couples.id, coupleId))
        .for("update");

      if (!couple || couple.status !== "pending") {
        return { ok: false, code: "CODE_ALREADY_USED" };
      }
      if (couple.expiresAt && couple.expiresAt < new Date()) {
        return { ok: false, code: "CODE_EXPIRED" };
      }
      if (couple.createdByUserId === userId) {
        return { ok: false, code: "CANNOT_PAIR_WITH_SELF" };
      }

      // The inviter may have joined someone else's code in the meantime.
      const [inviter] = couple.createdByUserId
        ? await tx
            .select()
            .from(users)
            .where(eq(users.id, couple.createdByUserId))
        : [];
      if (!inviter || inviter.coupleId !== couple.id) {
        await tx
          .update(couples)
          .set({ status: "archived", archivedAt: new Date(), ritualCode: null })
          .where(eq(couples.id, couple.id));
        return { ok: false, code: "INVITE_NO_LONGER_VALID" };
      }

      const [joiner] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update");

      if (joiner.coupleId) {
        const [previous] = await tx
          .select()
          .from(couples)
          .where(eq(couples.id, joiner.coupleId))
          .for("update");
        if (previous?.status === "active") {
          return { ok: false, code: "USER_ALREADY_PAIRED" };
        }
        if (
          previous?.status === "pending" &&
          previous.createdByUserId === userId
        ) {
          await tx
            .update(couples)
            .set({
              status: "archived",
              archivedAt: new Date(),
              archivedByUserId: userId,
              ritualCode: null,
            })
            .where(eq(couples.id, previous.id));
        }
      }

      await tx
        .update(couples)
        .set({ status: "active", activatedAt: new Date(), ritualCode: null })
        .where(eq(couples.id, couple.id));
      await tx.update(users).set({ coupleId }).where(eq(users.id, userId));

      return { ok: true };
    });
  }

  async unpairCoupleTransaction(
    coupleId: string,
    archivedByUserId: string,
  ): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [archived] = await tx
        .update(couples)
        .set({
          status: "archived",
          archivedAt: new Date(),
          archivedByUserId,
          ritualCode: null,
        })
        .where(and(eq(couples.id, coupleId), eq(couples.status, "active")))
        .returning();

      if (!archived) {
        return false;
      }

      const members = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.coupleId, coupleId));
      const memberIds = members.map((m) => m.id);

      if (memberIds.length > 0) {
        await tx
          .update(users)
          .set({ coupleId: null })
          .where(inArray(users.id, memberIds));
        await tx
          .update(notificationPrefs)
          .set({ partnerAlertsEnabled: false })
          .where(inArray(notificationPrefs.userId, memberIds));
      }

      return true;
    });
  }

  async getWalk(id: string): Promise<Walk | undefined> {
    const [walk] = await db.select().from(walks).where(eq(walks.id, id));
    return walk;
  }

  // Abandoned sessions (app killed, walk discarded) would otherwise be reused
  // with their old start time.
  async startWalk(userId: string, coupleId: string | null): Promise<Walk> {
    return db.transaction(async (tx) => {
      await tx
        .delete(walks)
        .where(and(eq(walks.userId, userId), eq(walks.isActive, true)));
      const [walk] = await tx
        .insert(walks)
        .values({
          userId,
          coupleId,
          distanceKm: 0,
          durationSeconds: 0,
          isActive: true,
        })
        .returning();
      return walk;
    });
  }

  async discardActiveWalk(walkId: string, userId: string): Promise<boolean> {
    const deleted = await db
      .delete(walks)
      .where(
        and(
          eq(walks.id, walkId),
          eq(walks.userId, userId),
          eq(walks.isActive, true),
        ),
      )
      .returning({ id: walks.id });
    return deleted.length > 0;
  }

  async endWalk(
    walkId: string,
    userId: string,
    coupleId: string | null,
    data: EndWalkData,
  ): Promise<EndWalkResult> {
    return db.transaction(async (tx): Promise<EndWalkResult> => {
      const [walk] = await tx
        .update(walks)
        .set({
          coupleId,
          distanceKm: data.distanceKm,
          durationSeconds: data.durationSeconds,
          stepsTotal: data.stepsTotal,
          pathJson: data.pathJson,
          isActive: false,
          endedAt: new Date(),
          localDate: data.localDate,
        })
        .where(
          and(
            eq(walks.id, walkId),
            eq(walks.userId, userId),
            eq(walks.isActive, true),
          ),
        )
        .returning();

      if (!walk) {
        const [existing] = await tx
          .select({ userId: walks.userId })
          .from(walks)
          .where(eq(walks.id, walkId));
        if (!existing) return { ok: false, code: "NOT_FOUND" };
        if (existing.userId !== userId) return { ok: false, code: "FORBIDDEN" };
        return { ok: false, code: "ALREADY_ENDED" };
      }

      if (coupleId && data.distanceKm > 0) {
        const [couple] = await tx
          .select()
          .from(couples)
          .where(eq(couples.id, coupleId))
          .for("update");

        if (couple) {
          const streak = applyWalkToStreak(
            {
              currentStreak: couple.currentStreak,
              lastLocalDate: lastWalkLocalDateOf(couple),
            },
            data.localDate,
          );
          await tx
            .update(couples)
            .set({
              totalKm: sql`${couples.totalKm} + ${data.distanceKm}`,
              currentStreak: streak.currentStreak,
              bestStreak: Math.max(couple.bestStreak, streak.currentStreak),
              lastWalkDate: new Date(),
              lastWalkLocalDate: streak.lastLocalDate,
            })
            .where(eq(couples.id, coupleId));
        }
      }

      return { ok: true, walk };
    });
  }

  async deleteWalk(walkId: string, userId: string): Promise<boolean> {
    return db.transaction(async (tx) => {
      const [walk] = await tx
        .delete(walks)
        .where(
          and(
            eq(walks.id, walkId),
            eq(walks.userId, userId),
            eq(walks.isActive, false),
          ),
        )
        .returning({ coupleId: walks.coupleId });
      if (!walk) return false;
      if (walk.coupleId) await rebuildCoupleStats(tx, walk.coupleId);
      return true;
    });
  }

  async deleteUserAccount(userId: string): Promise<void> {
    await db.transaction(async (tx) => {
      const [user] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .for("update");
      if (!user) return;

      if (user.coupleId) {
        const coupleId = user.coupleId;
        const members = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.coupleId, coupleId));
        const partnerIds = members
          .map((m) => m.id)
          .filter((id) => id !== userId);

        await tx
          .update(couples)
          .set({
            status: "archived",
            archivedAt: new Date(),
            archivedByUserId: userId,
            ritualCode: null,
          })
          .where(
            and(eq(couples.id, coupleId), sql`${couples.status} <> 'archived'`),
          );
        await tx
          .update(users)
          .set({ coupleId: null })
          .where(eq(users.coupleId, coupleId));
        if (partnerIds.length > 0) {
          await tx
            .update(notificationPrefs)
            .set({ partnerAlertsEnabled: false })
            .where(inArray(notificationPrefs.userId, partnerIds));
        }
      }

      await tx.delete(walks).where(eq(walks.userId, userId));
      await tx
        .delete(notificationPrefs)
        .where(eq(notificationPrefs.userId, userId));
      await tx.delete(userBadges).where(eq(userBadges.userId, userId));
      await tx.delete(passwordResets).where(eq(passwordResets.userId, userId));
      await tx
        .delete(authAttempts)
        .where(eq(authAttempts.key, `email:${user.email.toLowerCase()}`));
      await tx.delete(users).where(eq(users.id, userId));
    });
  }

  async getRecentWalksByCouple(coupleId: string, limit: number) {
    return db
      .select({
        id: walks.id,
        userId: walks.userId,
        distanceKm: walks.distanceKm,
        durationSeconds: walks.durationSeconds,
        startedAt: walks.startedAt,
      })
      .from(walks)
      .where(and(eq(walks.coupleId, coupleId), completedWalk))
      .orderBy(desc(walks.startedAt))
      .limit(limit);
  }

  async getWalksByCoupleBetween(coupleId: string, start: Date, end: Date) {
    return db
      .select({
        id: walks.id,
        userId: walks.userId,
        distanceKm: walks.distanceKm,
        durationSeconds: walks.durationSeconds,
        startedAt: walks.startedAt,
      })
      .from(walks)
      .where(
        and(
          eq(walks.coupleId, coupleId),
          completedWalk,
          gte(walks.startedAt, start),
          lte(walks.startedAt, end),
        ),
      )
      .orderBy(desc(walks.startedAt));
  }

  async countCompletedWalksByCouple(coupleId: string): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(walks)
      .where(and(eq(walks.coupleId, coupleId), completedWalk));
    return row?.value ?? 0;
  }

  // Counts live in the database so limits hold across serverless instances.
  async getAuthAttempts(
    key: string,
    windowSeconds: number,
  ): Promise<{ count: number; retryAfterSeconds: number }> {
    const [row] = await db
      .select({
        count: authAttempts.count,
        retryAfterSeconds: sql<number>`extract(epoch from (${authAttempts.windowStart} + make_interval(secs => ${windowSeconds}) - now()))::float8`,
      })
      .from(authAttempts)
      .where(
        and(
          eq(authAttempts.key, key),
          sql`${authAttempts.windowStart} > now() - make_interval(secs => ${windowSeconds})`,
        ),
      );
    return row ?? { count: 0, retryAfterSeconds: 0 };
  }

  async recordAuthAttempt(key: string, windowSeconds: number): Promise<void> {
    const expired = sql`${authAttempts.windowStart} <= now() - make_interval(secs => ${windowSeconds})`;
    await db
      .insert(authAttempts)
      .values({ key, count: 1 })
      .onConflictDoUpdate({
        target: authAttempts.key,
        set: {
          count: sql`case when ${expired} then 1 else ${authAttempts.count} + 1 end`,
          windowStart: sql`case when ${expired} then now() else ${authAttempts.windowStart} end`,
        },
      });
    await db
      .delete(authAttempts)
      .where(sql`${authAttempts.windowStart} < now() - interval '1 day'`);
  }

  async clearAuthAttempts(key: string): Promise<void> {
    await db.delete(authAttempts).where(eq(authAttempts.key, key));
  }

  async savePasswordReset(
    userId: string,
    codeHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await db
      .insert(passwordResets)
      .values({ userId, codeHash, expiresAt, attempts: 0 })
      .onConflictDoUpdate({
        target: passwordResets.userId,
        set: { codeHash, expiresAt, attempts: 0 },
      });
  }

  // Uses up one guess; returns nothing once the code's guesses are spent.
  async consumePasswordResetAttempt(
    userId: string,
    maxAttempts: number,
  ): Promise<PasswordReset | undefined> {
    const [reset] = await db
      .update(passwordResets)
      .set({ attempts: sql`${passwordResets.attempts} + 1` })
      .where(
        and(
          eq(passwordResets.userId, userId),
          sql`${passwordResets.attempts} < ${maxAttempts}`,
        ),
      )
      .returning();
    return reset;
  }

  async completePasswordReset(
    userId: string,
    passwordHash: string,
  ): Promise<User | undefined> {
    return db.transaction(async (tx) => {
      await tx.delete(passwordResets).where(eq(passwordResets.userId, userId));
      const [user] = await tx
        .update(users)
        .set({ password: passwordHash, passwordChangedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();
      return user;
    });
  }

  async clearPushToken(userId: string, pushToken: string): Promise<void> {
    await db
      .update(notificationPrefs)
      .set({ pushToken: null })
      .where(
        and(
          eq(notificationPrefs.userId, userId),
          eq(notificationPrefs.pushToken, pushToken),
        ),
      );
  }

  async getNotificationPrefs(
    userId: string,
  ): Promise<NotificationPrefs | undefined> {
    const [prefs] = await db
      .select()
      .from(notificationPrefs)
      .where(eq(notificationPrefs.userId, userId));
    return prefs;
  }

  async upsertNotificationPrefs(
    userId: string,
    data: Partial<NotificationPrefs>,
  ): Promise<NotificationPrefs> {
    const [prefs] = await db
      .insert(notificationPrefs)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: notificationPrefs.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return prefs;
  }
}

export const storage = new DatabaseStorage();
