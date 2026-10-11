import {
  users,
  couples,
  walks,
  notificationPrefs,
  type User,
  type InsertUser,
  type Couple,
  type Walk,
  type NotificationPrefs,
} from "../shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, gt, gte, lte, inArray, count } from "drizzle-orm";
import { applyWalkToStreak, lastWalkLocalDateOf } from "./streak";

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
