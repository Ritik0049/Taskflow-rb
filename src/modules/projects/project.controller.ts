import { Request, Response, NextFunction } from "express";
import * as service from "./project.service";
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
} from "./project.schema";
import { parsePagination } from "../../lib/pagination";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listProjectsSchema.parse(req.query);
    const result = await service.listProjects(req.auth!, parsePagination(query));
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getProject(req.auth!, String(req.params.id));
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProjectSchema.parse(req.body);
    const result = await service.createProject(req.auth!, input);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProjectSchema.parse(req.body);
    const result = await service.updateProject(req.auth!, String(req.params.id), input);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteProject(req.auth!, String(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function dashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.projectDashboard(req.auth!, String(req.params.id));
    res.json(result);
  } catch (e) {
    next(e);
  }
}