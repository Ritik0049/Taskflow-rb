import { PrismaClient } from "../../generated/prisma/client";

// Single shared instance. Multiple PrismaClients exhaust the DB connection pool.
export const prisma = new PrismaClient();