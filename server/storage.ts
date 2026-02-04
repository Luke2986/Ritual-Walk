import { users, couples, walks, notificationPrefs, type User, type InsertUser, type Couple, type Walk, type NotificationPrefs } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Couples
  getCouple(id: string): Promise<Couple | undefined>;
  getCoupleByRitualCode(ritualCode: string): Promise<Couple | undefined>;
  createCouple(ritualCode: string): Promise<Couple>;
  createCoupleWithInvite(ritualCode: string, createdByUserId: string, expiresAt: Date): Promise<Couple>;
  updateCouple(id: string, data: Partial<Couple>): Promise<Couple | undefined>;
  getCoupleUsers(coupleId: string): Promise<User[]>;
  joinCoupleTransaction(coupleId: string, userId: string): Promise<{ success: boolean; error?: string }>;
  unpairCoupleTransaction(coupleId: string, archivedByUserId: string): Promise<{ success: boolean; error?: string }>;

  // Walks
  getWalk(id: string): Promise<Walk | undefined>;
  getWalksByCouple(coupleId: string, limit?: number): Promise<Walk[]>;
  getWalksByUser(userId: string): Promise<Walk[]>;
  createWalk(userId: string, coupleId: string | null): Promise<Walk>;
  updateWalk(id: string, data: Partial<Walk>): Promise<Walk | undefined>;
  getActiveWalkByUser(userId: string): Promise<Walk | undefined>;

  // Notification Preferences
  getNotificationPrefs(userId: string): Promise<NotificationPrefs | undefined>;
  upsertNotificationPrefs(userId: string, data: Partial<NotificationPrefs>): Promise<NotificationPrefs>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Couples
  async getCouple(id: string): Promise<Couple | undefined> {
    const [couple] = await db.select().from(couples).where(eq(couples.id, id));
    return couple || undefined;
  }

  async getCoupleByRitualCode(ritualCode: string): Promise<Couple | undefined> {
    const [couple] = await db.select().from(couples).where(eq(couples.ritualCode, ritualCode));
    return couple || undefined;
  }

  async createCouple(ritualCode: string): Promise<Couple> {
    const [couple] = await db
      .insert(couples)
      .values({ ritualCode, status: "active" })
      .returning();
    return couple;
  }

  async createCoupleWithInvite(ritualCode: string, createdByUserId: string, expiresAt: Date): Promise<Couple> {
    const [couple] = await db
      .insert(couples)
      .values({
        ritualCode,
        status: "pending",
        createdByUserId,
        expiresAt,
      })
      .returning();
    return couple;
  }

  async updateCouple(id: string, data: Partial<Couple>): Promise<Couple | undefined> {
    const [couple] = await db
      .update(couples)
      .set(data)
      .where(eq(couples.id, id))
      .returning();
    return couple || undefined;
  }

  async getCoupleUsers(coupleId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.coupleId, coupleId));
  }

  async joinCoupleTransaction(coupleId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(couples)
          .set({
            status: "active",
            activatedAt: new Date(),
            ritualCode: null,
          })
          .where(and(eq(couples.id, coupleId), eq(couples.status, "pending")))
          .returning();

        if (!updated) {
          throw new Error("Il codice e gia stato usato o non e valido");
        }

        await tx.update(users).set({ coupleId }).where(eq(users.id, userId));

        return { success: true };
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || "Errore durante il collegamento" };
    }
  }

  async unpairCoupleTransaction(coupleId: string, archivedByUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await db.transaction(async (tx) => {
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
          throw new Error("La coppia non e attiva o non esiste");
        }

        await tx.update(users).set({ coupleId: null }).where(eq(users.coupleId, coupleId));

        await tx
          .update(notificationPrefs)
          .set({ partnerAlertsEnabled: false })
          .where(
            sql`user_id IN (SELECT id FROM users WHERE couple_id IS NULL AND id IN (
              SELECT id FROM users WHERE couple_id = ${coupleId}
            ))`
          );

        return { success: true };
      });
      return result;
    } catch (error: any) {
      return { success: false, error: error.message || "Errore durante lo scollegamento" };
    }
  }

  // Walks
  async getWalk(id: string): Promise<Walk | undefined> {
    const [walk] = await db.select().from(walks).where(eq(walks.id, id));
    return walk || undefined;
  }

  async getWalksByCouple(coupleId: string, limit = 20): Promise<Walk[]> {
    return db
      .select()
      .from(walks)
      .where(and(eq(walks.coupleId, coupleId), eq(walks.isActive, false)))
      .orderBy(desc(walks.startedAt))
      .limit(limit);
  }

  async getWalksByUser(userId: string): Promise<Walk[]> {
    return db
      .select()
      .from(walks)
      .where(and(eq(walks.userId, userId), eq(walks.isActive, false)))
      .orderBy(desc(walks.startedAt));
  }

  async createWalk(userId: string, coupleId: string | null): Promise<Walk> {
    const [walk] = await db
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
  }

  async updateWalk(id: string, data: Partial<Walk>): Promise<Walk | undefined> {
    const [walk] = await db
      .update(walks)
      .set(data)
      .where(eq(walks.id, id))
      .returning();
    return walk || undefined;
  }

  async getActiveWalkByUser(userId: string): Promise<Walk | undefined> {
    const [walk] = await db
      .select()
      .from(walks)
      .where(and(eq(walks.userId, userId), eq(walks.isActive, true)));
    return walk || undefined;
  }

  // Notification Preferences
  async getNotificationPrefs(userId: string): Promise<NotificationPrefs | undefined> {
    const [prefs] = await db
      .select()
      .from(notificationPrefs)
      .where(eq(notificationPrefs.userId, userId));
    return prefs || undefined;
  }

  async upsertNotificationPrefs(userId: string, data: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
    const existing = await this.getNotificationPrefs(userId);
    
    if (existing) {
      const [updated] = await db
        .update(notificationPrefs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(notificationPrefs.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(notificationPrefs)
        .values({ userId, ...data })
        .returning();
      return created;
    }
  }
}

export const storage = new DatabaseStorage();
