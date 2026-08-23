import { Request, Response, NextFunction } from "express";
import * as service from "./task.service";
import {
  createTaskSchema,
  updateTaskSchema,
  listTasksSchema,
  assignTaskSchema,
} from "./task.schema";
import { parsePagination } from "../../lib/pagination";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = listTasksSchema.parse(req.query);
    const { page, limit, ...filters } = q;
    const result = await service.listTasks(req.auth!, filters, parsePagination(q));
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function get(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.getTask(req.auth!, String(req.params.id));
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTaskSchema.parse(req.body);
    const result = await service.createTask(req.auth!, input);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskSchema.parse(req.body);
    const result = await service.updateTask(req.auth!, String(req.params.id), input);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteTask(req.auth!, String(req.params.id));
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function assign(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = assignTaskSchema.parse(req.body);
    const result = await service.assignTask(req.auth!, String(req.params.id), userId);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function unassign(req: Request, res: Response, next: NextFunction) {
  try {
    await service.unassignTask(
      req.auth!,
      String(req.params.id),
      String(req.params.userId)
    );
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}