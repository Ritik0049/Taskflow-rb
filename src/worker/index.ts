import "dotenv/config";
import { emailWorker } from "./emailWorker";

console.log("Email worker started, waiting for jobs...");

const shutdown = async () => {
  await emailWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);