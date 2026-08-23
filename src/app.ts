import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.set("trust proxy", 1);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found", code: "NOT_FOUND", details: {} });
  });

  app.use(errorHandler);

  return app;
}