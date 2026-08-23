import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { Unauthorized, Forbidden } from "../lib/error";
import { OrgRole } from "../../generated/prisma/enums";

export interface AuthContext {
  userId: string;
  orgId: string;
  role: OrgRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw Unauthorized("Missing or malformed Authorization header");
    }

    const token = header.slice(7);
    let payload: { sub: string };
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
    } catch {
      throw Unauthorized("Invalid or expired access token");
    }

    const membership = await prisma.orgMember.findFirst({
      where: { userId: payload.sub },
    });
    if (!membership) {
      throw Forbidden("User does not belong to any organization");
    }

    req.auth = {
      userId: membership.userId,
      orgId: membership.orgId,
      role: membership.role,
    };
    next();
  } catch (e) {
    next(e);
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.auth?.role !== OrgRole.org_admin) {
    return next(Forbidden("Requires org_admin role"));
  }
  next();
}