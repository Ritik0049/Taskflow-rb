import { describe, it, expect, beforeEach, afterAll } from "vitest";
import * as taskService from "../../src/modules/tasks/task.service";
import { prisma, resetDb, seedTwoOrgs } from "../helpers";
import { OrgRole } from "../../generated/prisma/enums";

describe("task assignment validation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("refuses to assign a user from another organization", async () => {
    const { orgA, userA, userB, taskA } = await seedTwoOrgs();
    const auth = { userId: userA.id, orgId: orgA.id, role: OrgRole.org_admin };

    await expect(taskService.assignTask(auth, taskA.id, userB.id)).rejects.toThrow(
      "Assignee does not belong to your organization"
    );
  });

  it("refuses to assign a task belonging to another organization", async () => {
    const { orgA, userA, taskB } = await seedTwoOrgs();
    const auth = { userId: userA.id, orgId: orgA.id, role: OrgRole.org_admin };

    await expect(taskService.assignTask(auth, taskB.id, userA.id)).rejects.toThrow();
  });

  it("rejects a duplicate assignment of the same user", async () => {
    const { orgA, userA, taskA } = await seedTwoOrgs();
    const auth = { userId: userA.id, orgId: orgA.id, role: OrgRole.org_admin };

    await taskService.assignTask(auth, taskA.id, userA.id);
    await expect(taskService.assignTask(auth, taskA.id, userA.id)).rejects.toThrow(
      "already assigned"
    );
  });

  it("persists the assignment and enqueues a notification job", async () => {
    const { orgA, userA, taskA } = await seedTwoOrgs();
    const auth = { userId: userA.id, orgId: orgA.id, role: OrgRole.org_admin };

    const result = await taskService.assignTask(auth, taskA.id, userA.id);
    expect(result.jobId).toBeTruthy();

    const row = await prisma.taskAssignment.findFirst({
      where: { taskId: taskA.id, userId: userA.id },
    });
    expect(row).not.toBeNull();
  });
});