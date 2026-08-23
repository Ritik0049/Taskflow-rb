import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { Unauthorized, Conflict } from "../../lib/error";
import { OrgRole } from "../../../generated/prisma/enums";

const BCRYPT_COST = 12; 
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;


const hashToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

function issueAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "15m",
  } as jwt.SignOptions);
}

async function issueRefreshToken(userId: string) {
  const token = crypto.randomBytes(40).toString("hex");
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });
  return token;
}

export async function register(input: {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw Conflict("EMAIL_TAKEN", "Email already registered");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);

  // Registering creates the org and makes the user its admin.
  const user = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({ data: { name: input.organizationName } });
    const created = await tx.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });
    await tx.orgMember.create({
      data: { userId: created.id, orgId: org.id, role: OrgRole.org_admin },
    });
    return created;
  });

  const accessToken = issueAccessToken(user.id);
  const refreshToken = await issueRefreshToken(user.id);
  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
}

export async function login(input: { email: string; password: string }) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  
  if (!user) throw Unauthorized("Invalid credentials");

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw Unauthorized("Invalid credentials");

  const accessToken = issueAccessToken(user.id);
  const refreshToken = await issueRefreshToken(user.id);
  return {
    user: { id: user.id, email: user.email, name: user.name },
    accessToken,
    refreshToken,
  };
}

export async function refresh(token: string) {
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw Unauthorized("Invalid or expired refresh token");
  }

  // Rotation: the presented token is revoked and a new one issued.
  // Limits the window in which a stolen token is usable.
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = issueAccessToken(stored.userId);
  const refreshToken = await issueRefreshToken(stored.userId);
  return { accessToken, refreshToken };
}

export async function logout(token: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}