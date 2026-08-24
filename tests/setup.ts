import dotenv from "dotenv";
import { execSync } from "child_process";

dotenv.config({ path: ".env.test", override: true });

execSync("npx prisma migrate deploy", {
  env: { ...process.env },
  stdio: "inherit",
});