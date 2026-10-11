import type { Express, Request, Response, NextFunction } from "express";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { lastWalkLocalDateOf } from "./streak";
import {
  registerSchema,
  loginSchema,
  joinCoupleSchema,
  endWalkSchema,
  statsQuerySchema,
  notificationPrefsUpdateSchema,
  type User,
  type Couple,
  type NotificationPrefs,
} from "../shared/schema";

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_STATS_RANGE_MS = 400 * 24 * 60 * 60 * 1000;
const RITUAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

interface AuthRequest extends Request {
  userId?: string;
}

type Handler = (req: AuthRequest, res: Response) => Promise<unknown>;

// Express 4 does not forward rejected promises to the error handler.
const handle =
  (fn: Handler) => (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };

function generateRitualCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += RITUAL_CODE_CHARS[randomInt(RITUAL_CODE_CHARS.length)];
  }
  return code;
}

async function generateUniqueRitualCode(): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRitualCode();
    if (!(await storage.getCoupleByRitualCode(code))) return code;
  }
  return null;
}

function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

function serializeUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    coupleId: user.coupleId,
  };
}

function serializeCouple(couple: Couple) {
  return {
    id: couple.id,
    ritualCode: couple.ritualCode,
    status: couple.status,
    createdByUserId: couple.createdByUserId,
    expiresAt: couple.expiresAt,
    totalKm: couple.totalKm,
    currentStreak: couple.currentStreak,
    bestStreak: couple.bestStreak,
    lastWalkDate: couple.lastWalkDate,
    lastWalkLocalDate: lastWalkLocalDateOf(couple),
  };
}

function serializePrefs(prefs: NotificationPrefs) {
  return {
    notificationsEnabled: prefs.notificationsEnabled,
    remindersEnabled: prefs.remindersEnabled,
    reminderTime: prefs.reminderTime,
    reminderDays: prefs.reminderDays,
    reminderMessage: prefs.reminderMessage,
    partnerAlertsEnabled: prefs.partnerAlertsEnabled,
    badgesEnabled: prefs.badgesEnabled,
    weeklySummaryEnabled: prefs.weeklySummaryEnabled,
    weeklySummaryDay: prefs.weeklySummaryDay,
    weeklySummaryTime: prefs.weeklySummaryTime,
    quietHoursEnabled: prefs.quietHoursEnabled,
    quietStart: prefs.quietStart,
    quietEnd: prefs.quietEnd,
  };
}

const DEFAULT_PREFS = {
  notificationsEnabled: false,
  remindersEnabled: true,
  reminderTime: "18:00",
  reminderDays: [1, 2, 3, 4, 5, 6, 7],
  reminderMessage: null,
  partnerAlertsEnabled: true,
  badgesEnabled: true,
  weeklySummaryEnabled: true,
  weeklySummaryDay: 7,
  weeklySummaryTime: "10:00",
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "08:00",
};

async function buildSession(user: User) {
  if (!user.coupleId) {
    return { user: serializeUser(user), couple: null, partner: null };
  }

  const [couple, members] = await Promise.all([
    storage.getCouple(user.coupleId),
    storage.getCoupleUsers(user.coupleId),
  ]);
  const partner = members.find((u) => u.id !== user.id);

  return {
    user: serializeUser(user),
    couple:
      couple && couple.status !== "archived" ? serializeCouple(couple) : null,
    partner: partner
      ? {
          id: partner.id,
          nickname: partner.nickname,
          avatarUrl: partner.avatarUrl,
        }
      : null,
  };
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET must be set");
  }
  return secret;
}

export function registerRoutes(app: Express): void {
  const jwtSecret = getJwtSecret();

  const signToken = (userId: string) =>
    jwt.sign({ userId }, jwtSecret, { expiresIn: "30d" });

  function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token non fornito" });
    }

    try {
      const decoded = jwt.verify(authHeader.slice(7), jwtSecret);
      if (typeof decoded === "string" || typeof decoded.userId !== "string") {
        throw new Error("Invalid token payload");
      }
      req.userId = decoded.userId;
      next();
    } catch {
      return res.status(401).json({ error: "Token non valido" });
    }
  }

  async function requireUser(
    req: AuthRequest,
    res: Response,
  ): Promise<User | null> {
    const user = await storage.getUser(req.userId!);
    if (!user) {
      res.status(401).json({ error: "Utente non trovato" });
      return null;
    }
    return user;
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Auth
  app.post(
    "/api/auth/register",
    handle(async (req, res) => {
      const data = registerSchema.parse(req.body);

      if (await storage.getUserByEmail(data.email)) {
        return res.status(400).json({ error: "Email gia registrata" });
      }

      let user: User;
      try {
        user = await storage.createUser({
          email: data.email,
          password: await bcrypt.hash(data.password, 10),
          nickname: data.nickname,
        });
      } catch (error) {
        if (isUniqueViolation(error)) {
          return res.status(400).json({ error: "Email gia registrata" });
        }
        throw error;
      }

      res.json({ token: signToken(user.id), ...(await buildSession(user)) });
    }),
  );

  app.post(
    "/api/auth/login",
    handle(async (req, res) => {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user || !(await bcrypt.compare(data.password, user.password))) {
        return res.status(401).json({ error: "Email o password non corretti" });
      }

      res.json({ token: signToken(user.id), ...(await buildSession(user)) });
    }),
  );

  app.get(
    "/api/auth/me",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;
      res.json(await buildSession(user));
    }),
  );

  // Couple: generate invite code (idempotent for a pending inviter)
  app.post(
    "/api/couple/generate",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;

      if (user.coupleId) {
        const existing = await storage.getCouple(user.coupleId);

        if (existing?.status === "active") {
          return res.status(409).json({
            error: "ALREADY_PAIRED",
            message: "Sei gia collegato a un partner",
          });
        }

        if (
          existing?.status === "pending" &&
          existing.createdByUserId === user.id
        ) {
          const isExpired =
            !existing.expiresAt || new Date() > existing.expiresAt;
          if (existing.ritualCode && !isExpired) {
            return res.json({
              invite_code: existing.ritualCode,
              expires_at: existing.expiresAt,
              couple_id: existing.id,
            });
          }

          const newCode = await generateUniqueRitualCode();
          if (!newCode) {
            return res.status(500).json({
              error: "Impossibile generare un codice univoco, riprova",
            });
          }
          const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
          await storage.updateCouple(existing.id, {
            ritualCode: newCode,
            expiresAt,
          });
          return res.json({
            invite_code: newCode,
            expires_at: expiresAt,
            couple_id: existing.id,
          });
        }

        // Missing, archived, or someone else's pending couple: start fresh.
        await storage.updateUser(user.id, { coupleId: null });
      }

      const ritualCode = await generateUniqueRitualCode();
      if (!ritualCode) {
        return res
          .status(500)
          .json({ error: "Impossibile generare un codice univoco, riprova" });
      }

      const couple = await storage.createCoupleWithInvite(
        ritualCode,
        user.id,
        new Date(Date.now() + INVITE_TTL_MS),
      );
      await storage.updateUser(user.id, { coupleId: couple.id });

      res.json({
        invite_code: couple.ritualCode,
        expires_at: couple.expiresAt,
        couple_id: couple.id,
      });
    }),
  );

  async function getOwnPendingInvite(user: User, res: Response) {
    if (!user.coupleId) {
      res.status(400).json({
        error: "NOT_PENDING",
        message: "Non hai un invito in sospeso",
      });
      return null;
    }
    const couple = await storage.getCouple(user.coupleId);
    if (!couple) {
      await storage.updateUser(user.id, { coupleId: null });
      res.status(400).json({
        error: "NOT_PENDING",
        message: "Non hai un invito in sospeso",
      });
      return null;
    }
    if (couple.status !== "pending") {
      res.status(409).json({
        error: "NOT_PENDING",
        message: "L'invito non e in sospeso",
      });
      return null;
    }
    if (couple.createdByUserId !== user.id) {
      res.status(403).json({
        error: "NOT_INVITER",
        message: "Non sei chi ha creato l'invito",
      });
      return null;
    }
    return couple;
  }

  app.post(
    "/api/couple/regenerate",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;
      const couple = await getOwnPendingInvite(user, res);
      if (!couple) return;

      const newCode = await generateUniqueRitualCode();
      if (!newCode) {
        return res
          .status(500)
          .json({ error: "Impossibile generare un codice univoco, riprova" });
      }
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      await storage.updateCouple(couple.id, { ritualCode: newCode, expiresAt });

      res.json({
        invite_code: newCode,
        expires_at: expiresAt,
        couple_id: couple.id,
      });
    }),
  );

  app.post(
    "/api/couple/cancel-invite",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;
      const couple = await getOwnPendingInvite(user, res);
      if (!couple) return;

      await storage.updateCouple(couple.id, {
        status: "archived",
        archivedAt: new Date(),
        archivedByUserId: user.id,
        ritualCode: null,
      });
      await storage.updateUser(user.id, { coupleId: null });

      res.json({ ok: true });
    }),
  );

  const JOIN_ERRORS = {
    CODE_ALREADY_USED: [409, "Questo codice e gia stato usato"],
    CODE_EXPIRED: [410, "Il codice e scaduto"],
    INVITE_NO_LONGER_VALID: [409, "Questo invito non e piu valido"],
    USER_ALREADY_PAIRED: [409, "Sei gia collegato a un partner"],
    CANNOT_PAIR_WITH_SELF: [400, "Non puoi collegarti con te stesso"],
  } as const;

  app.post(
    "/api/couple/join",
    authMiddleware,
    handle(async (req, res) => {
      const { ritualCode } = joinCoupleSchema.parse(req.body);
      const user = await requireUser(req, res);
      if (!user) return;

      const couple = await storage.getCoupleByRitualCode(ritualCode);
      if (!couple) {
        return res
          .status(404)
          .json({ error: "INVALID_CODE", message: "Codice non valido" });
      }

      const result = await storage.joinCoupleTransaction(couple.id, user.id);
      if (!result.ok) {
        const [status, message] = JOIN_ERRORS[result.code];
        return res.status(status).json({ error: result.code, message });
      }

      const members = await storage.getCoupleUsers(couple.id);
      const partner = members.find((u) => u.id !== user.id);

      res.json({
        couple_id: couple.id,
        partner: partner
          ? {
              id: partner.id,
              nickname: partner.nickname,
              avatarUrl: partner.avatarUrl,
            }
          : null,
      });
    }),
  );

  app.post(
    "/api/couple/unpair",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;

      if (!user.coupleId) {
        return res.status(409).json({
          error: "NOT_PAIRED",
          message: "Non sei collegato a nessun partner",
        });
      }

      const unpaired = await storage.unpairCoupleTransaction(
        user.coupleId,
        user.id,
      );
      if (!unpaired) {
        return res.status(409).json({
          error: "COUPLE_NOT_ACTIVE",
          message: "La coppia non e attiva",
        });
      }

      res.json({ ok: true });
    }),
  );

  // Walks
  app.post(
    "/api/walks/start",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;
      const walk = await storage.startWalk(user.id, user.coupleId);
      res.json({ walk });
    }),
  );

  app.post(
    "/api/walks/:walkId/end",
    authMiddleware,
    handle(async (req, res) => {
      const data = endWalkSchema.parse(req.body);
      const user = await requireUser(req, res);
      if (!user) return;

      const result = await storage.endWalk(
        req.params.walkId,
        user.id,
        user.coupleId,
        data,
      );

      if (!result.ok) {
        const status = { NOT_FOUND: 404, FORBIDDEN: 403, ALREADY_ENDED: 409 }[
          result.code
        ];
        const message = {
          NOT_FOUND: "Camminata non trovata",
          FORBIDDEN: "Non autorizzato",
          ALREADY_ENDED: "Camminata gia salvata",
        }[result.code];
        return res.status(status).json({ error: result.code, message });
      }

      res.json({ walk: result.walk });
    }),
  );

  app.post(
    "/api/walks/:walkId/discard",
    authMiddleware,
    handle(async (req, res) => {
      await storage.discardActiveWalk(req.params.walkId, req.userId!);
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/walks/recent",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;
      if (!user.coupleId) return res.json([]);

      const [walks, members] = await Promise.all([
        storage.getRecentWalksByCouple(user.coupleId, 5),
        storage.getCoupleUsers(user.coupleId),
      ]);
      const nicknames = new Map(members.map((u) => [u.id, u.nickname]));

      res.json(
        walks.map((walk) => ({
          ...walk,
          userNickname: nicknames.get(walk.userId) || "Utente",
        })),
      );
    }),
  );

  app.get(
    "/api/walks/stats",
    authMiddleware,
    handle(async (req, res) => {
      const query = statsQuerySchema.parse(req.query);
      const user = await requireUser(req, res);
      if (!user) return;

      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      if (end.getTime() - start.getTime() > MAX_STATS_RANGE_MS) {
        return res.status(400).json({
          error: "INVALID_INPUT",
          message: "Intervallo di date troppo ampio",
        });
      }

      if (!user.coupleId) {
        return res.json({ walks: [], userId: user.id, partnerId: null });
      }

      const [walks, members] = await Promise.all([
        storage.getWalksByCoupleBetween(user.coupleId, start, end),
        storage.getCoupleUsers(user.coupleId),
      ]);
      const partner = members.find((u) => u.id !== user.id);

      res.json({
        walks,
        userId: user.id,
        partnerId: partner?.id || null,
      });
    }),
  );

  app.get(
    "/api/walks/count",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;
      const count = user.coupleId
        ? await storage.countCompletedWalksByCouple(user.coupleId)
        : 0;
      res.json({ count });
    }),
  );

  // Must stay after the fixed /api/walks/* paths above.
  app.get(
    "/api/walks/:walkId",
    authMiddleware,
    handle(async (req, res) => {
      const user = await requireUser(req, res);
      if (!user) return;

      const walk = await storage.getWalk(req.params.walkId);
      const canView =
        walk &&
        !walk.isActive &&
        (walk.userId === user.id ||
          (walk.coupleId !== null && walk.coupleId === user.coupleId));
      if (!walk || !canView) {
        return res.status(404).json({ error: "Camminata non trovata" });
      }

      const owner =
        walk.userId === user.id ? user : await storage.getUser(walk.userId);

      res.json({
        id: walk.id,
        userId: walk.userId,
        distanceKm: walk.distanceKm,
        durationSeconds: walk.durationSeconds,
        stepsTotal: walk.stepsTotal,
        pathJson: walk.pathJson ?? [],
        startedAt: walk.startedAt,
        endedAt: walk.endedAt,
        userNickname: owner?.nickname || "Utente",
      });
    }),
  );

  // Notification preferences
  app.get(
    "/api/notification-prefs",
    authMiddleware,
    handle(async (req, res) => {
      const prefs = await storage.getNotificationPrefs(req.userId!);
      res.json(prefs ? serializePrefs(prefs) : DEFAULT_PREFS);
    }),
  );

  app.put(
    "/api/notification-prefs",
    authMiddleware,
    handle(async (req, res) => {
      const data = notificationPrefsUpdateSchema.parse(req.body);
      const prefs = await storage.upsertNotificationPrefs(req.userId!, data);
      res.json(serializePrefs(prefs));
    }),
  );
}
