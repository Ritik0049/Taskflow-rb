import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma, resetDb, seedTwoOrgs } from "../helpers";

const app = createApp();

async function loginAs(email: string) {
  const res = await request(app)
    .post("/auth/login")
    .send({ email, password: "Password123!" });
  return res.body.accessToken as string;
}

describe("integration: login flow", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("logs in with valid credentials and returns tokens", async () => {
    await seedTwoOrgs();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@test.com", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    // The password hash must never appear in a response.
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("rejects invalid credentials with 401", async () => {
    await seedTwoOrgs();

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "a@test.com", password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("rejects a malformed email with a 400 validation error", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "not-an-email", password: "Password123!" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("VALIDATION_ERROR");
  });
});

describe("integration: task CRUD", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("creates, reads, updates and soft-deletes a task", async () => {
    const { projectA } = await seedTwoOrgs();
    const token = await loginAs("a@test.com");
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post("/tasks")
      .set(auth)
      .send({ projectId: projectA.id, title: "New task", priority: "high" });
    expect(created.status).toBe(201);
    const taskId = created.body.id;

    const read = await request(app).get(`/tasks/${taskId}`).set(auth);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe("New task");

    const updated = await request(app)
      .patch(`/tasks/${taskId}`)
      .set(auth)
      .send({ status: "in_progress" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("in_progress");

    const deleted = await request(app).delete(`/tasks/${taskId}`).set(auth);
    expect(deleted.status).toBe(204);

    // Soft delete: the row survives but is excluded from reads.
    const afterDelete = await request(app).get(`/tasks/${taskId}`).set(auth);
    expect(afterDelete.status).toBe(404);
    const row = await prisma.task.findUnique({ where: { id: taskId } });
    expect(row!.deletedAt).not.toBeNull();
  });

  it("returns the documented pagination envelope", async () => {
    await seedTwoOrgs();
    const token = await loginAs("a@test.com");

    const res = await request(app)
      .get("/tasks?page=1&limit=20")
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("total");
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });
});

describe("integration: cross-tenant isolation", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("returns 403 and no data when reading another org's project", async () => {
    const { projectB } = await seedTwoOrgs();
    const token = await loginAs("a@test.com");

    const res = await request(app)
      .get(`/projects/${projectB.id}`)
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
    
    expect(res.body).not.toHaveProperty("name");
    expect(JSON.stringify(res.body)).not.toContain("Project B");
  });

  it("returns 403 when reading another org's task", async () => {
    const { taskB } = await seedTwoOrgs();
    const token = await loginAs("a@test.com");

    const res = await request(app)
      .get(`/tasks/${taskB.id}`)
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toContain("Task B");
  });

  it("excludes other orgs' projects from list results", async () => {
    await seedTwoOrgs();
    const token = await loginAs("a@test.com");

    const res = await request(app)
      .get("/projects")
      .set({ Authorization: `Bearer ${token}` });

    expect(res.body.total).toBe(1);
    expect(res.body.data[0].name).toBe("Project A");
  });

  it("rejects a request with no token", async () => {
    const res = await request(app).get("/projects");
    expect(res.status).toBe(401);
  });
});