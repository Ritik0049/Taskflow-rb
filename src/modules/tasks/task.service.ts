import { prisma } from "../../lib/prisma";
import { NotFound, Forbidden, Conflict } from "../../lib/error";
import { AuthContext } from "../../middleware/auth";
import { PageParams, toSkipTake, buildPage } from "../../lib/pagination";
import { TaskStatus, TaskPriority } from "../../../generated/prisma/enums";


export async function getTask(auth: AuthContext, id: string) {
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null, project: { orgId: auth.orgId, deletedAt: null } },
    include: { assignments: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  if (!task) {
    const existsElsewhere = await prisma.task.findUnique({ where: { id } });
    if (existsElsewhere) throw Forbidden("Access to this resource is not permitted");
    throw NotFound("Task", "TASK_NOT_FOUND");
  }
  return task;
}

export async function listTasks(
  auth: AuthContext,
  filters: {
    projectId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    dueFrom?: Date;
    dueTo?: Date;
  },
  pageParams: PageParams
) {
  const where = {
    deletedAt: null,
    project: { orgId: auth.orgId, deletedAt: null },
    ...(filters.projectId && { projectId: filters.projectId }),
    ...(filters.status && { status: filters.status }),
    ...(filters.priority && { priority: filters.priority }),
    ...(filters.assigneeId && { assignments: { some: { userId: filters.assigneeId } } }),
    ...((filters.dueFrom || filters.dueTo) && {
      dueDate: {
        ...(filters.dueFrom && { gte: filters.dueFrom }),
        ...(filters.dueTo && { lte: filters.dueTo }),
      },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      ...toSkipTake(pageParams),
      orderBy: { createdAt: "desc" },
      include: { assignments: { include: { user: { select: { id: true, name: true, email: true } } } } },
    }),
    prisma.task.count({ where }),
  ]);

  return buildPage(data, total, pageParams);
}

export async function createTask(
  auth: AuthContext,
  input: {
    projectId: string;
    title: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
  }
) {
 
  const project = await prisma.project.findFirst({
    where: { id: input.projectId, orgId: auth.orgId, deletedAt: null },
  });
  if (!project) throw Forbidden("Project does not belong to your organization");

  return prisma.task.create({ data: input });
}

export async function updateTask(
  auth: AuthContext,
  id: string,
  input: Record<string, unknown>
) {
  await getTask(auth, id);
  return prisma.task.update({ where: { id }, data: input });
}

export async function deleteTask(auth: AuthContext, id: string) {
  await getTask(auth, id);
  return prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function assignTask(auth: AuthContext, taskId: string, userId: string) {
  await getTask(auth, taskId);

  const membership = await prisma.orgMember.findFirst({
    where: { userId, orgId: auth.orgId },
  });
  if (!membership) throw Forbidden("Assignee does not belong to your organization");

  const existing = await prisma.taskAssignment.findUnique({
    where: { taskId_userId: { taskId, userId } },
  });
  if (existing) throw Conflict("ALREADY_ASSIGNED", "User is already assigned to this task");

  return prisma.taskAssignment.create({ data: { taskId, userId } });
}

export async function unassignTask(auth: AuthContext, taskId: string, userId: string) {
  await getTask(auth, taskId);
  const deleted = await prisma.taskAssignment.deleteMany({ where: { taskId, userId } });
  if (deleted.count === 0) {
    throw NotFound("Assignment", "ASSIGNMENT_NOT_FOUND");
  }
}