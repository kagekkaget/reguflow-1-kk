// ============================================================================
// ReguFlow - Server entrypoint
// ----------------------------------------------------------------------------
// Stack: Express 5 + Helmet + CORS + httpOnly cookies + JWT + Drizzle (Neon).
// ============================================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth";
import { assessmentsRouter } from "./routes/assessments";
import { businessesRouter } from "./routes/businesses";
import { adminRouter } from "./routes/admin";
import { rulesRouter } from "./routes/rules";
import {
  ingredientsRouter,
  productsRouter,
  suppliersRouter,
} from "./routes/products";
import { complianceRouter } from "./routes/compliance";
import { documentsRouter } from "./routes/documents";
import { organizationsRouter } from "./routes/organizations";
import {
  commentsRouter,
  engagementsRouter,
  notificationsRouter,
} from "./routes/engagements";
import { remindersRouter, tasksRouter } from "./routes/tasks";
import { errorHandler } from "./middleware/error";
import { logger, notFound } from "./middleware/logger";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use(logger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "reguflow-api" });
});

// Routes publik (tanpa auth)
app.use("/api/auth", authRouter);
app.use("/api/assessments", assessmentsRouter);

// Routes terproteksi (setiap router memanggil authenticate sendiri)
app.use("/api/organizations", organizationsRouter);
app.use("/api/businesses", businessesRouter);
app.use("/api/products", productsRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/ingredients", ingredientsRouter);
app.use("/api/compliance", complianceRouter);
app.use("/api/documents", documentsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/engagements", engagementsRouter);
app.use("/api/comments", commentsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/rules", rulesRouter);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT ?? 3000;

app.listen(PORT, () => {
  console.log(`[api] ReguFlow server running on :${PORT}`);
});

export default app;
