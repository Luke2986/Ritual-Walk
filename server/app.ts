import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { ZodError } from "zod";
import { registerRoutes } from "./routes";

function setupCors(app: Express) {
  const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );

  app.use((req, res, next) => {
    const origin = req.header("origin");
    const isLocalhost =
      !!origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

    if (origin && (allowedOrigins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });
}

function setupRequestLogging(app: Express) {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api")) {
        console.log(
          `${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`,
        );
      }
    });
    next();
  });
}

function setupErrorHandler(app: Express) {
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: "INVALID_INPUT",
        message: err.errors[0]?.message ?? "Dati non validi",
      });
    }

    const error = err as { status?: number; statusCode?: number };
    const status = error.status || error.statusCode || 500;
    if (status >= 500) {
      console.error(err);
    }

    res.status(status).json({
      error: status >= 500 ? "SERVER_ERROR" : "BAD_REQUEST",
      message:
        status === 413
          ? "Dati troppo grandi"
          : status >= 500
            ? "Errore del server"
            : "Richiesta non valida",
    });
  });
}

export function createApp(): Express {
  const app = express();
  // Vercel, Render, Railway and Fly put the client IP in X-Forwarded-For; used by login limits.
  app.set("trust proxy", 1);

  setupCors(app);
  app.use(express.json({ limit: "1mb" }));
  setupRequestLogging(app);

  app.get("/", (_req, res) => {
    res.json({ name: "Step Ritual API", ok: true });
  });

  registerRoutes(app);

  app.use("/api", (_req, res) => {
    res
      .status(404)
      .json({ error: "NOT_FOUND", message: "Endpoint non trovato" });
  });

  setupErrorHandler(app);
  return app;
}
