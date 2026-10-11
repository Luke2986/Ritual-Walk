import type { Express, Request, Response, NextFunction } from "express";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { lastWalkLocalDateOf } from "./streak";
import { isMailConfigured, sendPasswordResetEmail } from "./mailer";
import { sendExpoPush } from "./push";
import { isInQuietHours, timeInZone } from "../shared/quietHours";
import { badgeProgress, earnedBadges, type BadgeKey } from "../shared/badges";
import {
  registerSchema,
  loginSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  joinCoupleSchema,
  endWalkSchema,
  statsQuerySchema,
  badgesQuerySchema,
  notificationPrefsUpdateSchema,
  type User,
  type Couple,
  type NotificationPrefs,
} from "../shared/schema";

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_STATS_RANGE_MS = 400 * 24 * 60 * 60 * 1000;
const RITUAL_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ATTEMPT_WINDOW_SECONDS = 15 * 60;
const LOGIN_FAILURES_PER_EMAIL = 10;
const LOGIN_FAILURES_PER_IP = 30;
const RESET_REQUESTS_PER_EMAIL = 3;
const RESET_REQUESTS_PER_IP = 10;
const RESET_FAILURES_PER_IP = 20;
const RESET_CODE_TTL_MINUTES = 15;
const RESET_CODE_MAX_GUESSES = 5;

// Compared against when the email is unknown, so both cases take a bcrypt check.
const DUMMY_PASSWORD_HASH =
  "$2b$10$xbVZpmnkYw38UVmITOD1ZeQEHoqH2/p35nYhRENajF5ry/g5zAD7.";

interface AuthRequest extends Request {
  user?: User;
}

type Handler = (req: AuthRequest, res: Response) => Promise<unknown>;

// Express 4 does not forward rejected promises to the error handler.
// A handler used as middleware returns "next" to continue the chain.
const handle =
  (fn: Handler) => (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).then((result) => {
      if (result === "next") next();
    }, next);
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
    pushToken: prefs.pushToken,
    timeZone: prefs.timeZone,
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
  pushToken: null,
  timeZone: null,
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

  const resetCodeHash = (userId: string, code: string) =>
    createHmac("sha256", jwtSecret).update(`${userId}:${code}`).digest();

  const authMiddleware = handle(async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token non fornito" });
    }

    let payload: jwt.JwtPayload;
    try {
      const decoded = jwt.verify(authHeader.slice(7), jwtSecret);
      if (typeof decoded === "string" || typeof decoded.userId !== "string") {
        throw new Error("Invalid token payload");
      }
      payload = decoded;
    } catch {
      return res.status(401).json({ error: "Token non valido" });
    }

    const user = await storage.getUser(payload.userId);
    // A password reset logs out every session created before it.
    const revoked =
      !!user?.passwordChangedAt &&
      (payload.iat ?? 0) < Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (!user || revoked) {
      return res.status(401).json({ error: "Sessione scaduta" });
    }
    req.user = user;
    return "next";
  });

  const clientIp = (req: Request) => req.ip ?? "unknown";

  async function rejectIfTooManyAttempts(
    res: Response,
    limits: [key: string, max: number][],
  ): Promise<boolean> {
    for (const [key, max] of limits) {
      const { count, retryAfterSeconds } = await storage.getAuthAttempts(
        key,
        ATTEMPT_WINDOW_SECONDS,
      );
      if (count >= max) {
        const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
        res.status(429).json({
          error: "TOO_MANY_ATTEMPTS",
          message: `Troppi tentativi. Riprova tra ${minutes} ${minutes === 1 ? "minuto" : "minuti"}.`,
        });
        return true;
      }
    }
    return false;
  }

  const recordAttempts = (keys: string[]) =>
    Promise.all(
      keys.map((key) => storage.recordAuthAttempt(key, ATTEMPT_WINDOW_SECONDS)),
    );

  // Stores the badges the ritual's walks have reached; returns the ones earned just now.
  async function awardBadges(coupleId: string): Promise<BadgeKey[]> {
    const walks = await storage.getBadgeWalks(coupleId);
    return storage.addCoupleBadges(coupleId, earnedBadges(walks));
  }

  async function notifyPartnerOfWalk(walker: User, distanceKm: number) {
    if (!walker.coupleId || distanceKm <= 0) return;
    const partner = (await storage.getCoupleUsers(walker.coupleId)).find(
      (u) => u.id !== walker.id,
    );
    const prefs = partner && (await storage.getNotificationPrefs(partner.id));
    if (
      !partner ||
      !prefs?.pushToken ||
      !prefs.notificationsEnabled ||
      !prefs.partnerAlertsEnabled
    ) {
      return;
    }
    if (prefs.quietHoursEnabled) {
      // Without the partner's time zone we can't tell, so stay quiet.
      if (!prefs.timeZone) return;
      const localTime = timeInZone(new Date(), prefs.timeZone);
      if (isInQuietHours(localTime, prefs.quietStart, prefs.quietEnd)) return;
    }

    const km = distanceKm.toLocaleString("it-IT", { maximumFractionDigits: 1 });
    const result = await sendExpoPush(
      prefs.pushToken,
      "Step Ritual",
      `${walker.nickname} ha appena camminato ${km} km. Tocca a te?`,
    );
    if (result === "unregistered") {
      await storage.clearPushToken(partner.id, prefs.pushToken);
    }
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
        return res.status(400).json({ error: "Email già registrata" });
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
          return res.status(400).json({ error: "Email già registrata" });
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
      const emailKey = `email:${data.email}`;
      const ipKey = `ip:${clientIp(req)}`;
      if (
        await rejectIfTooManyAttempts(res, [
          [emailKey, LOGIN_FAILURES_PER_EMAIL],
          [ipKey, LOGIN_FAILURES_PER_IP],
        ])
      ) {
        return;
      }

      const user = await storage.getUserByEmail(data.email);
      const passwordOk = await bcrypt.compare(
        data.password,
        user?.password ?? DUMMY_PASSWORD_HASH,
      );
      if (!user || !passwordOk) {
        await recordAttempts([emailKey, ipKey]);
        return res.status(401).json({ error: "Email o password non corretti" });
      }

      await storage.clearAuthAttempts(emailKey);
      res.json({ token: signToken(user.id), ...(await buildSession(user)) });
    }),
  );

  app.get(
    "/api/auth/me",
    authMiddleware,
    handle(async (req, res) => {
      const user = req.user!;
      res.json(await buildSession(user));
    }),
  );

  app.get("/api/features", (_req, res) => {
    res.json({ passwordReset: isMailConfigured() });
  });

  app.post(
    "/api/auth/forgot-password",
    handle(async (req, res) => {
      if (!isMailConfigured()) {
        return res.status(503).json({
          error: "RESET_UNAVAILABLE",
          message: "Il recupero password non è attivo su questo server",
        });
      }
      const { email } = forgotPasswordSchema.parse(req.body);
      const emailKey = `reset-email:${email}`;
      const ipKey = `reset-ip:${clientIp(req)}`;
      if (
        await rejectIfTooManyAttempts(res, [
          [emailKey, RESET_REQUESTS_PER_EMAIL],
          [ipKey, RESET_REQUESTS_PER_IP],
        ])
      ) {
        return;
      }
      await recordAttempts([emailKey, ipKey]);

      const user = await storage.getUserByEmail(email);
      if (user) {
        const code = String(randomInt(1_000_000)).padStart(6, "0");
        await storage.savePasswordReset(
          user.id,
          resetCodeHash(user.id, code).toString("hex"),
          new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
        );
        try {
          await sendPasswordResetEmail(
            user.email,
            code,
            RESET_CODE_TTL_MINUTES,
          );
        } catch (error) {
          console.error("Could not send password reset email:", error);
          return res.status(502).json({
            error: "EMAIL_FAILED",
            message: "Invio dell'email non riuscito, riprova più tardi",
          });
        }
      }

      // Same answer whether or not the email has an account.
      res.json({ ok: true });
    }),
  );

  app.post(
    "/api/auth/reset-password",
    handle(async (req, res) => {
      const data = resetPasswordSchema.parse(req.body);
      const ipKey = `reset-fail-ip:${clientIp(req)}`;
      if (
        await rejectIfTooManyAttempts(res, [[ipKey, RESET_FAILURES_PER_IP]])
      ) {
        return;
      }

      const user = await storage.getUserByEmail(data.email);
      const reset =
        user &&
        (await storage.consumePasswordResetAttempt(
          user.id,
          RESET_CODE_MAX_GUESSES,
        ));
      const codeOk =
        !!user &&
        !!reset &&
        reset.expiresAt > new Date() &&
        timingSafeEqual(
          Buffer.from(reset.codeHash, "hex"),
          resetCodeHash(user.id, data.code),
        );
      if (!user || !codeOk) {
        await recordAttempts([ipKey]);
        return res.status(400).json({
          error: "INVALID_CODE",
          message: "Codice non valido o scaduto",
        });
      }

      const updated = (await storage.completePasswordReset(
        user.id,
        await bcrypt.hash(data.password, 10),
      ))!;
      await storage.clearAuthAttempts(`email:${updated.email.toLowerCase()}`);
      res.json({
        token: signToken(updated.id),
        ...(await buildSession(updated)),
      });
    }),
  );

  app.post(
    "/api/auth/delete-account",
    authMiddleware,
    handle(async (req, res) => {
      const { password } = deleteAccountSchema.parse(req.body);
      const user = req.user!;
      const emailKey = `email:${user.email.toLowerCase()}`;
      if (
        await rejectIfTooManyAttempts(res, [
          [emailKey, LOGIN_FAILURES_PER_EMAIL],
        ])
      ) {
        return;
      }
      if (!(await bcrypt.compare(password, user.password))) {
        await recordAttempts([emailKey]);
        return res
          .status(403)
          .json({ error: "WRONG_PASSWORD", message: "Password non corretta" });
      }

      await storage.deleteUserAccount(user.id);
      res.json({ ok: true });
    }),
  );

  // Couple: generate invite code (idempotent for a pending inviter)
  app.post(
    "/api/couple/generate",
    authMiddleware,
    handle(async (req, res) => {
      const user = req.user!;

      if (user.coupleId) {
        const existing = await storage.getCouple(user.coupleId);

        if (existing?.status === "active") {
          return res.status(409).json({
            error: "ALREADY_PAIRED",
            message: "Il tuo account è già collegato a un'altra persona",
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
        message: "L'invito non è in sospeso",
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
      const user = req.user!;
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
      const user = req.user!;
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
    CODE_ALREADY_USED: [409, "Questo codice è già stato usato"],
    CODE_EXPIRED: [410, "Il codice è scaduto"],
    INVITE_NO_LONGER_VALID: [409, "Questo invito non è più valido"],
    USER_ALREADY_PAIRED: [
      409,
      "Il tuo account è già collegato a un'altra persona",
    ],
    CANNOT_PAIR_WITH_SELF: [
      400,
      "Questo è il tuo codice: condividilo con chi vuoi invitare",
    ],
  } as const;

  app.post(
    "/api/couple/join",
    authMiddleware,
    handle(async (req, res) => {
      const { ritualCode } = joinCoupleSchema.parse(req.body);
      const user = req.user!;

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
      const user = req.user!;

      if (!user.coupleId) {
        return res.status(409).json({
          error: "NOT_PAIRED",
          message: "Il tuo account non è collegato a nessuno",
        });
      }

      const unpaired = await storage.unpairCoupleTransaction(
        user.coupleId,
        user.id,
      );
      if (!unpaired) {
        return res.status(409).json({
          error: "COUPLE_NOT_ACTIVE",
          message: "Il rituale non è attivo",
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
      const user = req.user!;
      const walk = await storage.startWalk(user.id, user.coupleId);
      res.json({ walk });
    }),
  );

  app.post(
    "/api/walks/:walkId/end",
    authMiddleware,
    handle(async (req, res) => {
      const data = endWalkSchema.parse(req.body);
      const user = req.user!;

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
          ALREADY_ENDED: "Camminata già salvata",
        }[result.code];
        return res.status(status).json({ error: result.code, message });
      }

      // The walk is saved: a badge error must not turn the save into a failure.
      const newBadges =
        user.coupleId && data.distanceKm > 0
          ? await awardBadges(user.coupleId).catch((error) => {
              console.warn("Badge update failed:", error);
              return [];
            })
          : [];

      // Awaited because serverless hosts may stop work after the response.
      await notifyPartnerOfWalk(user, data.distanceKm).catch((error) =>
        console.warn("Partner alert failed:", error),
      );
      res.json({ walk: result.walk, newBadges });
    }),
  );

  app.post(
    "/api/walks/:walkId/discard",
    authMiddleware,
    handle(async (req, res) => {
      await storage.discardActiveWalk(req.params.walkId, req.user!.id);
      res.json({ ok: true });
    }),
  );

  app.get(
    "/api/walks/recent",
    authMiddleware,
    handle(async (req, res) => {
      const user = req.user!;
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
      const user = req.user!;

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

  // `today` is the phone's local date: progress such as "this week" depends on it.
  app.get(
    "/api/badges",
    authMiddleware,
    handle(async (req, res) => {
      const { today } = badgesQuerySchema.parse(req.query);
      const user = req.user!;
      if (!user.coupleId) {
        return res.json({ earned: [], progress: badgeProgress([], today) });
      }

      const walks = await storage.getBadgeWalks(user.coupleId);
      // Also records badges reached before they were stored (older walks).
      await storage.addCoupleBadges(user.coupleId, earnedBadges(walks));
      const earned = await storage.getCoupleBadges(user.coupleId);
      res.json({ earned, progress: badgeProgress(walks, today) });
    }),
  );

  app.delete(
    "/api/walks/:walkId",
    authMiddleware,
    handle(async (req, res) => {
      const deleted = await storage.deleteWalk(req.params.walkId, req.user!.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ error: "NOT_FOUND", message: "Camminata non trovata" });
      }
      res.json({ ok: true });
    }),
  );

  // Must stay after the fixed /api/walks/* paths above.
  app.get(
    "/api/walks/:walkId",
    authMiddleware,
    handle(async (req, res) => {
      const user = req.user!;

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
      const prefs = await storage.getNotificationPrefs(req.user!.id);
      res.json(prefs ? serializePrefs(prefs) : DEFAULT_PREFS);
    }),
  );

  app.put(
    "/api/notification-prefs",
    authMiddleware,
    handle(async (req, res) => {
      const data = notificationPrefsUpdateSchema.parse(req.body);
      const prefs = await storage.upsertNotificationPrefs(req.user!.id, data);
      res.json(serializePrefs(prefs));
    }),
  );
}
