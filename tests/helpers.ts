import { PrismaClient } from "../generated/prisma/client";
import { OrgRole } from "../generated/prisma/enums";
import bcrypt from "bcrypt";

export const prisma = new PrismaClient();

export async function resetDb() {
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();
}

export async function seedTwoOrgs() {
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const orgA = await prisma.organization.create({ data: { name: "Org A" } });
  const orgB = await prisma.organization.create({ data: { name: "Org B" } });

  const userA = await prisma.user.create({
    data: { email: "a@test.com", name: "User A", passwordHash },
  });
  const userB = await prisma.user.create({
    data: { email: "b@test.com", name: "User B", passwordHash },
  });

  await prisma.orgMember.create({
    data: { userId: userA.id, orgId: orgA.id, role: OrgRole.org_admin },
  });
  await prisma.orgMember.create({
    data: { userId: userB.id, orgId: orgB.id, role: OrgRole.org_admin },
  });

  const projectA = await prisma.project.create({
    data: { orgId: orgA.id, name: "Project A" },
  });
  const projectB = await prisma.project.create({
    data: { orgId: orgB.id, name: "Project B" },
  });

  const taskA = await prisma.task.create({
    data: { projectId: projectA.id, title: "Task A" },
  });
  const taskB = await prisma.task.create({
    data: { projectId: projectB.id, title: "Task B" },
  });

  return { orgA, orgB, userA, userB, projectA, projectB, taskA, taskB };
}