import express from "express";
import authRoutes from "./modules/auth/auth.routes";
import { errorHandler } from "./middleware/errorHandler";
import projectRoutes from "./modules/projects/project.routes";
import taskRoutes from "./modules/tasks/task.routes";

export function createApp() {
  const app = express();

  app.use(express.json());

  app.set("trust proxy", 1);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/auth", authRoutes);
  app.use("/projects", projectRoutes);
  app.use("/tasks", taskRoutes);
  app.use((_req, res) => {
    res.status(404).json({ error: "Route not found", code: "NOT_FOUND", details: {} });
  });

  app.use(errorHandler);

  return app;
}