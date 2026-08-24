import { describe, it, expect, beforeEach, afterAll } from "vitest";
import * as authService from "../../src/modules/auth/auth.service";
import { prisma, resetDb } from "../helpers";
import bcrypt from "bcrypt";

describe("authentication logic", () => {
  beforeEach(async () => {
    await resetDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("hashes passwords with bcrypt at cost 12 or higher", async () => {
    const result = await authService.register({
      email: "hash@test.com",
      password: "Password123!",
      name: "Hash Test",
      organizationName: "Hash Org",
    });

    const user = await prisma.user.findUnique({ where: { id: result.user.id } });
    const cost = Number(user!.passwordHash.split("$")[2]);
    expect(cost).toBeGreaterThanOrEqual(12);
    expect(user!.passwordHash).not.toBe("Password123!");
  });

  it("stores refresh tokens hashed, never in plaintext", async () => {
    const result = await authService.register({
      email: "store@test.com",
      password: "Password123!",
      name: "Store Test",
      organizationName: "Store Org",
    });

    const stored = await prisma.refreshToken.findFirst();
    expect(stored!.tokenHash).not.toBe(result.refreshToken);
  });

  it("rejects login with a wrong password", async () => {
    const passwordHash = await bcrypt.hash("Correct123!", 12);
    await prisma.user.create({
      data: { email: "login@test.com", name: "Login", passwordHash },
    });

    await expect(
      authService.login({ email: "login@test.com", password: "Wrong123!" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("returns the same error for an unknown email, preventing user enumeration", async () => {
    await expect(
      authService.login({ email: "nobody@test.com", password: "Whatever123!" })
    ).rejects.toThrow("Invalid credentials");
  });

  it("revokes the old refresh token on rotation", async () => {
    const reg = await authService.register({
      email: "rotate@test.com",
      password: "Password123!",
      name: "Rotate",
      organizationName: "Rotate Org",
    });

    await authService.refresh(reg.refreshToken);
    await expect(authService.refresh(reg.refreshToken)).rejects.toThrow();
  });
});