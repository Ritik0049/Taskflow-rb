import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { TaskStatus, TaskPriority, OrgRole } from "../generated/prisma/enums";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Idempotent: wipe in FK-safe order so re-running the seed doesn't hit unique constraints.
  await prisma.comment.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.project.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Cost factor 12 as required by Task 02.
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const acme = await prisma.organization.create({ data: { name: "Acme Corp" } });
  const globex = await prisma.organization.create({ data: { name: "Globex Inc" } });

  const mkUser = (email: string, name: string) =>
    prisma.user.create({ data: { email, name, passwordHash } });

  const alice = await mkUser("alice@acme.test", "Alice Admin");
  const bob = await mkUser("bob@acme.test", "Bob Member");
  const carol = await mkUser("carol@acme.test", "Carol Member");
  const dave = await mkUser("dave@globex.test", "Dave Admin");
  const erin = await mkUser("erin@globex.test", "Erin Member");

  await prisma.orgMember.createMany({
    data: [
      { userId: alice.id, orgId: acme.id, role: OrgRole.org_admin },
      { userId: bob.id, orgId: acme.id, role: OrgRole.member },
      { userId: carol.id, orgId: acme.id, role: OrgRole.member },
      { userId: dave.id, orgId: globex.id, role: OrgRole.org_admin },
      { userId: erin.id, orgId: globex.id, role: OrgRole.member },
    ],
  });

  const apollo = await prisma.project.create({
    data: { orgId: acme.id, name: "Apollo Website", description: "Marketing site rebuild" },
  });
  const zephyr = await prisma.project.create({
    data: { orgId: acme.id, name: "Zephyr Mobile", description: "iOS and Android client" },
  });
  const orion = await prisma.project.create({
    data: { orgId: globex.id, name: "Orion Platform", description: "Internal tooling" },
  });

  const day = (n: number) => new Date(Date.now() + n * 86_400_000);

  await prisma.task.createMany({
    data: [
      { projectId: apollo.id, title: "Design landing page", description: "Hero, features, pricing sections", status: TaskStatus.done, priority: TaskPriority.high, dueDate: day(-3) },
      { projectId: apollo.id, title: "Implement navigation", description: "Responsive header with mobile drawer", status: TaskStatus.in_progress, priority: TaskPriority.medium, dueDate: day(2) },
      { projectId: apollo.id, title: "Set up analytics", description: "GA4 plus custom events", status: TaskStatus.todo, priority: TaskPriority.low, dueDate: day(10) },
      { projectId: apollo.id, title: "Fix contact form validation", description: "Email regex rejects valid addresses", status: TaskStatus.review, priority: TaskPriority.urgent, dueDate: day(1) },
      { projectId: zephyr.id, title: "Push notification service", description: "FCM and APNs integration", status: TaskStatus.in_progress, priority: TaskPriority.high, dueDate: day(5) },
      { projectId: zephyr.id, title: "Offline mode caching", description: "Local persistence layer", status: TaskStatus.todo, priority: TaskPriority.medium, dueDate: day(14) },
      { projectId: zephyr.id, title: "Crash on cold start", description: "Null deref in session restore", status: TaskStatus.todo, priority: TaskPriority.urgent, dueDate: day(0) },
      { projectId: zephyr.id, title: "Update onboarding copy", description: "Shorten to three screens", status: TaskStatus.done, priority: TaskPriority.low, dueDate: day(-7) },
      { projectId: orion.id, title: "SSO integration", description: "SAML for enterprise customers", status: TaskStatus.in_progress, priority: TaskPriority.urgent, dueDate: day(4) },
      { projectId: orion.id, title: "Audit log viewer", description: "Filterable table with export", status: TaskStatus.todo, priority: TaskPriority.medium, dueDate: day(9) },
      { projectId: orion.id, title: "Rate limit admin API", description: "Per-tenant quotas", status: TaskStatus.review, priority: TaskPriority.high, dueDate: day(3) },
      { projectId: orion.id, title: "Migrate legacy reports", description: "Port remaining twelve reports", status: TaskStatus.todo, priority: TaskPriority.low, dueDate: day(21) },
    ],
  });

  const acmeTasks = await prisma.task.findMany({
    where: { projectId: { in: [apollo.id, zephyr.id] } },
    orderBy: { createdAt: "asc" },
  });
  const globexTasks = await prisma.task.findMany({
    where: { projectId: orion.id },
    orderBy: { createdAt: "asc" },
  });

  const a = (i: number) => acmeTasks[i]!.id;
  const g = (i: number) => globexTasks[i]!.id;

  await prisma.taskAssignment.createMany({
    data: [
      { taskId: a(0), userId: bob.id },
      { taskId: a(1), userId: bob.id },
      { taskId: a(2), userId: carol.id },
      { taskId: a(3), userId: carol.id },
      { taskId: a(4), userId: alice.id },
      { taskId: a(5), userId: bob.id },
      { taskId: g(0), userId: erin.id },
      { taskId: g(1), userId: erin.id },
      { taskId: g(2), userId: dave.id },
    ],
  });

  await prisma.comment.createMany({
    data: [
      { taskId: a(1), userId: alice.id, body: "Please match the spacing from the Figma file." },
      { taskId: a(1), userId: bob.id, body: "Updated, ready for another look." },
      { taskId: a(3), userId: carol.id, body: "Reproduced on Safari 17 only." },
      { taskId: a(6), userId: alice.id, body: "Blocking the release, raising to urgent." },
      { taskId: g(0), userId: dave.id, body: "Waiting on the IdP metadata from the customer." },
    ],
  });

  console.log("Seed complete:");
  console.log("  2 organizations, 5 users, 3 projects, 12 tasks, 9 assignments, 5 comments");
  console.log("  Login with any seeded email and password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });