import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "node:http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { registerSchema, loginSchema, joinCoupleSchema, users } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET || "step-ritual-secret-key-change-in-production";

// Generate random ritual code
function generateRitualCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Calculate streak
function calculateStreak(lastWalkDate: Date | null, currentStreak: number): number {
  if (!lastWalkDate) return 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastWalk = new Date(lastWalkDate);
  lastWalk.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - lastWalk.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return currentStreak; // Already walked today
  } else if (diffDays === 1) {
    return currentStreak + 1; // Consecutive day
  } else {
    return 1; // Streak broken
  }
}

// Authentication middleware
interface AuthRequest extends Request {
  userId?: string;
}

async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token non fornito" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token non valido" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);

      // Check if email exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email gia registrata" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Create user
      const user = await storage.createUser({
        email: data.email,
        password: passwordHash,
        nickname: data.nickname,
      });

      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          coupleId: user.coupleId,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Errore durante la registrazione" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);

      // Find user
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ error: "Email o password non corretti" });
      }

      // Verify password
      const isValid = await bcrypt.compare(data.password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Email o password non corretti" });
      }

      // Get couple and partner if exists
      let couple = null;
      let partner = null;
      if (user.coupleId) {
        couple = await storage.getCouple(user.coupleId);
        const coupleUsers = await storage.getCoupleUsers(user.coupleId);
        partner = coupleUsers.find((u) => u.id !== user.id);
      }

      // Generate token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          coupleId: user.coupleId,
        },
        couple: couple
          ? {
              id: couple.id,
              ritualCode: couple.ritualCode,
              status: couple.status,
              createdByUserId: couple.createdByUserId,
              expiresAt: couple.expiresAt,
              totalKm: couple.totalKm,
              currentStreak: couple.currentStreak,
              lastWalkDate: couple.lastWalkDate,
            }
          : null,
        partner: partner
          ? {
              id: partner.id,
              nickname: partner.nickname,
              avatarUrl: partner.avatarUrl,
            }
          : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Errore durante il login" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      let couple = null;
      let partner = null;
      if (user.coupleId) {
        couple = await storage.getCouple(user.coupleId);
        const coupleUsers = await storage.getCoupleUsers(user.coupleId);
        partner = coupleUsers.find((u) => u.id !== user.id);
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          coupleId: user.coupleId,
        },
        couple: couple
          ? {
              id: couple.id,
              ritualCode: couple.ritualCode,
              status: couple.status,
              createdByUserId: couple.createdByUserId,
              expiresAt: couple.expiresAt,
              totalKm: couple.totalKm,
              currentStreak: couple.currentStreak,
              lastWalkDate: couple.lastWalkDate,
            }
          : null,
        partner: partner
          ? {
              id: partner.id,
              nickname: partner.nickname,
              avatarUrl: partner.avatarUrl,
            }
          : null,
      });
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ error: "Errore nel recupero utente" });
    }
  });

  // Helper function to generate unique ritual code
  async function generateUniqueRitualCode(): Promise<string | null> {
    let ritualCode = "";
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      ritualCode = generateRitualCode();
      const existing = await storage.getCoupleByRitualCode(ritualCode);
      if (!existing) return ritualCode;
      attempts++;
    }
    return null;
  }

  // Couple routes - Generate invite code (IDEMPOTENT)
  app.post("/api/couple/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      // Case: User already has a couple_id
      if (user.coupleId) {
        const existingCouple = await storage.getCouple(user.coupleId);
        
        if (!existingCouple) {
          // Orphan reference - clean up and create new
          await storage.updateUser(user.id, { coupleId: null });
        } else if (existingCouple.status === "active") {
          // Case: Already paired
          return res.status(409).json({ error: "ALREADY_PAIRED", message: "Sei gia collegato a un partner" });
        } else if (existingCouple.status === "archived") {
          // Case: Archived couple - clean up and create new
          await storage.updateUser(user.id, { coupleId: null });
        } else if (existingCouple.status === "pending") {
          // Case: Pending invite exists
          const isInviter = existingCouple.createdByUserId === user.id;
          const isExpired = existingCouple.expiresAt && new Date() > new Date(existingCouple.expiresAt);
          const hasCode = !!existingCouple.ritualCode;
          
          if (isInviter) {
            // User is the inviter
            if (hasCode && !isExpired) {
              // RECOVER: Return existing valid code
              console.log(`[Pairing] RECOVER: Utente ${user.id} recupera codice esistente ${existingCouple.ritualCode}`);
              return res.json({
                invite_code: existingCouple.ritualCode,
                expires_at: existingCouple.expiresAt,
                couple_id: existingCouple.id,
              });
            } else {
              // REGENERATE: Code expired or missing
              const newCode = await generateUniqueRitualCode();
              if (!newCode) {
                return res.status(500).json({ error: "Impossibile generare un codice univoco, riprova" });
              }
              const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
              
              await storage.updateCouple(existingCouple.id, {
                ritualCode: newCode,
                expiresAt: newExpiresAt,
              });
              
              console.log(`[Pairing] REGENERATE: Utente ${user.id} rigenera codice ${newCode}, scade: ${newExpiresAt}`);
              return res.json({
                invite_code: newCode,
                expires_at: newExpiresAt,
                couple_id: existingCouple.id,
              });
            }
          } else {
            // User is NOT the inviter but has pending couple (was invited, invite pending)
            // This is an inconsistent state - clean up and let them create new
            await storage.updateUser(user.id, { coupleId: null });
          }
        }
      }

      // Case: User is unpaired - create new invite
      const ritualCode = await generateUniqueRitualCode();
      if (!ritualCode) {
        return res.status(500).json({ error: "Impossibile generare un codice univoco, riprova" });
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const couple = await storage.createCoupleWithInvite(ritualCode, user.id, expiresAt);

      await storage.updateUser(user.id, { coupleId: couple.id });

      console.log(`[Pairing] CREATE: Utente ${user.id} ha generato codice ${ritualCode}, scade: ${expiresAt}`);

      res.json({
        invite_code: couple.ritualCode,
        expires_at: couple.expiresAt,
        couple_id: couple.id,
      });
    } catch (error) {
      console.error("Generate couple error:", error);
      res.status(500).json({ error: "Errore nella creazione del codice invito" });
    }
  });

  // Couple routes - Regenerate invite code (force regeneration)
  app.post("/api/couple/regenerate", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      if (!user.coupleId) {
        return res.status(400).json({ error: "NOT_PENDING", message: "Non hai un invito in sospeso" });
      }

      const couple = await storage.getCouple(user.coupleId);
      if (!couple) {
        await storage.updateUser(user.id, { coupleId: null });
        return res.status(400).json({ error: "NOT_PENDING", message: "Non hai un invito in sospeso" });
      }

      if (couple.status !== "pending") {
        return res.status(409).json({ error: "NOT_PENDING", message: "L'invito non e in sospeso" });
      }

      if (couple.createdByUserId !== user.id) {
        return res.status(403).json({ error: "NOT_INVITER", message: "Non sei chi ha creato l'invito" });
      }

      const newCode = await generateUniqueRitualCode();
      if (!newCode) {
        return res.status(500).json({ error: "Impossibile generare un codice univoco, riprova" });
      }
      
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      await storage.updateCouple(couple.id, {
        ritualCode: newCode,
        expiresAt: newExpiresAt,
      });
      
      console.log(`[Pairing] FORCE-REGENERATE: Utente ${user.id} forza rigenerazione codice ${newCode}`);
      
      res.json({
        invite_code: newCode,
        expires_at: newExpiresAt,
        couple_id: couple.id,
      });
    } catch (error) {
      console.error("Regenerate couple error:", error);
      res.status(500).json({ error: "Errore nella rigenerazione del codice" });
    }
  });

  // Couple routes - Cancel pending invite
  app.post("/api/couple/cancel-invite", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      if (!user.coupleId) {
        return res.status(400).json({ error: "NOT_PENDING", message: "Non hai un invito in sospeso" });
      }

      const couple = await storage.getCouple(user.coupleId);
      if (!couple) {
        await storage.updateUser(user.id, { coupleId: null });
        return res.json({ ok: true });
      }

      if (couple.status !== "pending") {
        return res.status(409).json({ error: "NOT_PENDING", message: "L'invito non e in sospeso" });
      }

      if (couple.createdByUserId !== user.id) {
        return res.status(403).json({ error: "NOT_INVITER", message: "Non sei chi ha creato l'invito" });
      }

      // Archive the couple and unlink user
      await storage.updateCouple(couple.id, {
        status: "archived",
        archivedAt: new Date(),
        archivedByUserId: user.id,
        ritualCode: null,
      });
      
      await storage.updateUser(user.id, { coupleId: null });
      
      console.log(`[Pairing] CANCEL: Utente ${user.id} ha annullato l'invito della coppia ${couple.id}`);
      
      res.json({ ok: true });
    } catch (error) {
      console.error("Cancel invite error:", error);
      res.status(500).json({ error: "Errore nell'annullamento dell'invito" });
    }
  });

  // Couple routes - Join with invite code
  app.post("/api/couple/join", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { ritualCode } = joinCoupleSchema.parse(req.body);

      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      if (user.coupleId) {
        const existingCouple = await storage.getCouple(user.coupleId);
        if (existingCouple && existingCouple.status === "active") {
          return res.status(409).json({ error: "USER_ALREADY_PAIRED", message: "Sei gia collegato a un partner" });
        }
      }

      const couple = await storage.getCoupleByRitualCode(ritualCode.toUpperCase());
      if (!couple) {
        return res.status(404).json({ error: "INVALID_CODE", message: "Codice non valido" });
      }

      if (couple.status !== "pending") {
        return res.status(409).json({ error: "CODE_ALREADY_USED", message: "Questo codice e gia stato usato" });
      }

      if (couple.expiresAt && new Date() > new Date(couple.expiresAt)) {
        return res.status(410).json({ error: "CODE_EXPIRED", message: "Il codice e scaduto" });
      }

      if (couple.createdByUserId === user.id) {
        return res.status(400).json({ error: "CANNOT_PAIR_WITH_SELF", message: "Non puoi collegarti con te stesso" });
      }

      const result = await storage.joinCoupleTransaction(couple.id, user.id);

      if (!result.success) {
        return res.status(409).json({ error: "JOIN_FAILED", message: result.error });
      }

      const coupleUsers = await storage.getCoupleUsers(couple.id);
      const partner = coupleUsers.find((u) => u.id !== user.id);

      console.log(`[Pairing] Utente ${user.id} si e unito alla coppia ${couple.id} con partner ${partner?.id}`);

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
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "INVALID_INPUT", message: error.errors[0].message });
      }
      console.error("Join couple error:", error);
      res.status(500).json({ error: "Errore nel collegamento al partner" });
    }
  });

  // Couple routes - Unpair (archive couple and unlink both users)
  app.post("/api/couple/unpair", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      if (!user.coupleId) {
        return res.status(409).json({ error: "NOT_PAIRED", message: "Non sei collegato a nessun partner" });
      }

      const couple = await storage.getCouple(user.coupleId);
      if (!couple) {
        return res.status(404).json({ error: "COUPLE_NOT_FOUND", message: "Coppia non trovata" });
      }

      if (couple.status !== "active") {
        return res.status(409).json({ error: "COUPLE_NOT_ACTIVE", message: "La coppia non e attiva" });
      }

      const coupleUsers = await storage.getCoupleUsers(user.coupleId);
      const isMember = coupleUsers.some((u) => u.id === user.id);
      if (!isMember) {
        return res.status(403).json({ error: "NOT_MEMBER", message: "Non fai parte di questa coppia" });
      }

      const result = await storage.unpairCoupleTransaction(user.coupleId, user.id);

      if (!result.success) {
        return res.status(409).json({ error: "UNPAIR_FAILED", message: result.error });
      }

      console.log(`[Unpair] Utente ${user.id} ha scollegato la coppia ${couple.id}`);

      res.json({ ok: true });
    } catch (error) {
      console.error("Unpair couple error:", error);
      res.status(500).json({ error: "Errore durante lo scollegamento" });
    }
  });

  // Legacy endpoints for backwards compatibility
  app.post("/api/couples/create", authMiddleware, async (req: AuthRequest, res: Response) => {
    req.url = "/api/couple/generate";
    return app._router.handle(req, res, () => {});
  });

  app.post("/api/couples/join", authMiddleware, async (req: AuthRequest, res: Response) => {
    req.url = "/api/couple/join";
    return app._router.handle(req, res, () => {});
  });

  // Walk routes
  app.post("/api/walks/start", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user) {
        return res.status(404).json({ error: "Utente non trovato" });
      }

      // Check for active walk
      const activeWalk = await storage.getActiveWalkByUser(user.id);
      if (activeWalk) {
        return res.json({ walk: activeWalk });
      }

      // Create new walk (coupleId can be null if user has no partner yet)
      const walk = await storage.createWalk(user.id, user.coupleId);

      res.json({ walk });
    } catch (error) {
      console.error("Start walk error:", error);
      res.status(500).json({ error: "Errore nell'inizio della camminata" });
    }
  });

  app.post("/api/walks/:walkId/end", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { walkId } = req.params;
      const { distanceKm, durationSeconds, stepsTotal, pathJson } = req.body;

      const walk = await storage.getWalk(walkId);
      if (!walk) {
        return res.status(404).json({ error: "Camminata non trovata" });
      }

      if (walk.userId !== req.userId) {
        return res.status(403).json({ error: "Non autorizzato" });
      }

      // Update walk
      const updatedWalk = await storage.updateWalk(walkId, {
        distanceKm: distanceKm || 0,
        durationSeconds: durationSeconds || 0,
        stepsTotal: stepsTotal || 0,
        pathJson: pathJson || [],
        isActive: false,
        endedAt: new Date(),
      });

      // Update couple stats
      if (walk.coupleId && distanceKm > 0) {
        const couple = await storage.getCouple(walk.coupleId);
        if (couple) {
          const newStreak = calculateStreak(couple.lastWalkDate, couple.currentStreak);
          await storage.updateCouple(couple.id, {
            totalKm: couple.totalKm + distanceKm,
            currentStreak: newStreak,
            lastWalkDate: new Date(),
          });
        }
      }

      res.json({ walk: updatedWalk });
    } catch (error) {
      console.error("End walk error:", error);
      res.status(500).json({ error: "Errore nel termine della camminata" });
    }
  });

  app.get("/api/walks", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || !user.coupleId) {
        return res.json([]);
      }

      const walks = await storage.getWalksByCouple(user.coupleId);

      // Get nicknames for walks
      const coupleUsers = await storage.getCoupleUsers(user.coupleId);
      const userMap = new Map(coupleUsers.map((u) => [u.id, u.nickname]));

      const walksWithNicknames = walks.map((walk) => ({
        ...walk,
        userNickname: userMap.get(walk.userId) || "Utente",
      }));

      res.json(walksWithNicknames);
    } catch (error) {
      console.error("Get walks error:", error);
      res.status(500).json({ error: "Errore nel recupero delle camminate" });
    }
  });

  app.get("/api/walks/recent", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || !user.coupleId) {
        return res.json([]);
      }

      const walks = await storage.getWalksByCouple(user.coupleId, 5);

      // Get nicknames for walks
      const coupleUsers = await storage.getCoupleUsers(user.coupleId);
      const userMap = new Map(coupleUsers.map((u) => [u.id, u.nickname]));

      const walksWithNicknames = walks.map((walk) => ({
        id: walk.id,
        distanceKm: walk.distanceKm,
        durationSeconds: walk.durationSeconds,
        startedAt: walk.startedAt,
        userNickname: userMap.get(walk.userId) || "Utente",
      }));

      res.json(walksWithNicknames);
    } catch (error) {
      console.error("Get recent walks error:", error);
      res.status(500).json({ error: "Errore nel recupero delle camminate recenti" });
    }
  });

  app.get("/api/walks/stats", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || !user.coupleId) {
        return res.json({ walks: [], userId: null, partnerId: null });
      }

      const { startDate, endDate } = req.query;
      
      const walks = await storage.getWalksByCouple(user.coupleId);
      
      const coupleUsers = await storage.getCoupleUsers(user.coupleId);
      const partner = coupleUsers.find((u) => u.id !== user.id);

      let filteredWalks = walks.filter(w => !w.isActive && w.distanceKm > 0);
      
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        filteredWalks = filteredWalks.filter(w => {
          const walkDate = new Date(w.startedAt);
          return walkDate >= start && walkDate <= end;
        });
      }

      const walksWithInfo = filteredWalks.map(walk => ({
        id: walk.id,
        userId: walk.userId,
        distanceKm: walk.distanceKm,
        durationSeconds: walk.durationSeconds,
        startedAt: walk.startedAt,
      }));

      console.log(`[Stats] Periodo: ${startDate} - ${endDate}, Camminate reali trovate: ${walksWithInfo.length}`);

      res.json({
        walks: walksWithInfo,
        userId: user.id,
        partnerId: partner?.id || null,
      });
    } catch (error) {
      console.error("Get walks stats error:", error);
      res.status(500).json({ error: "Errore nel recupero delle statistiche" });
    }
  });

  app.get("/api/walks/:walkId", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { walkId } = req.params;

      const walk = await storage.getWalk(walkId);
      if (!walk) {
        return res.status(404).json({ error: "Camminata non trovata" });
      }

      const user = await storage.getUser(walk.userId);

      res.json({
        ...walk,
        userNickname: user?.nickname || "Utente",
      });
    } catch (error) {
      console.error("Get walk error:", error);
      res.status(500).json({ error: "Errore nel recupero della camminata" });
    }
  });

  // Notification preferences routes
  app.get("/api/notification-prefs", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const prefs = await storage.getNotificationPrefs(req.userId!);
      
      if (!prefs) {
        // Return default preferences if not set
        return res.json({
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
        });
      }

      res.json({
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
      });
    } catch (error) {
      console.error("Get notification prefs error:", error);
      res.status(500).json({ error: "Errore nel recupero delle preferenze notifiche" });
    }
  });

  app.put("/api/notification-prefs", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const allowedFields = [
        "notificationsEnabled",
        "remindersEnabled",
        "reminderTime",
        "reminderDays",
        "reminderMessage",
        "partnerAlertsEnabled",
        "badgesEnabled",
        "weeklySummaryEnabled",
        "weeklySummaryDay",
        "weeklySummaryTime",
        "quietHoursEnabled",
        "quietStart",
        "quietEnd",
        "pushToken",
      ];

      const updateData: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      }

      const prefs = await storage.upsertNotificationPrefs(req.userId!, updateData);

      res.json({
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
      });
    } catch (error) {
      console.error("Update notification prefs error:", error);
      res.status(500).json({ error: "Errore nell'aggiornamento delle preferenze notifiche" });
    }
  });

  // Walks count endpoint for badges
  app.get("/api/walks/count", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.userId!);
      if (!user || !user.coupleId) {
        return res.json({ count: 0 });
      }

      const walks = await storage.getWalksByCouple(user.coupleId, 1000);
      const completedWalks = walks.filter(w => !w.isActive && w.distanceKm > 0);
      
      res.json({ count: completedWalks.length });
    } catch (error) {
      console.error("Get walks count error:", error);
      res.status(500).json({ error: "Errore nel conteggio camminate" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
