import { prisma } from "../../lib/prisma";
import { NotFound, Forbidden } from "../../lib/error";
import { AuthContext } from "../../middleware/auth";
import { PageParams, toSkipTake, buildPage } from "../../lib/pagination";
import { OrgRole } from "../../../generated/prisma/enums";


export async function listProjects(auth: AuthContext, pageParams: PageParams) {
  const where = { orgId: auth.orgId, deletedAt: null };
  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      ...toSkipTake(pageParams),
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.count({ where }),
  ]);
  return buildPage(data, total, pageParams);
}

export async function getProject(auth: AuthContext, id: string) {
  const project = await prisma.project.findFirst({
    where: { id, orgId: auth.orgId, deletedAt: null },
  });
  
  if (!project) {
    const existsElsewhere = await prisma.project.findUnique({ where: { id } });
    if (existsElsewhere) throw Forbidden("Access to this resource is not permitted");
    throw NotFound("Project", "PROJECT_NOT_FOUND");
  }
  return project;
}

export async function createProject(
  auth: AuthContext,
  input: { name: string; description?: string }
) {
  return prisma.project.create({
    data: { ...input, orgId: auth.orgId },
  });
}

export async function updateProject(
  auth: AuthContext,
  id: string,
  input: { name?: string; description?: string }
) {
  await getProject(auth, id); 
  return prisma.project.update({ where: { id }, data: input });
}

export async function deleteProject(auth: AuthContext, id: string) {
  if (auth.role !== OrgRole.org_admin) {
    throw Forbidden("Only org_admin can delete projects");
  }
  await getProject(auth, id);
  
  return prisma.project.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function projectDashboard(auth: AuthContext, id: string) {
  await getProject(auth, id);
  const grouped = await prisma.task.groupBy({
    by: ["status"],
    where: { projectId: id, deletedAt: null },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {
    todo: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };
  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }

  return {
    projectId: id,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    byStatus: counts,
  };
}