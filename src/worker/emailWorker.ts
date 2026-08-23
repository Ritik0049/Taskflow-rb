import { Worker, Job } from "bullmq";
import { redisConnection } from "../lib/redis";
import { EMAIL_QUEUE_NAME, emailDlq, AssignmentEmailJob } from "../queue/emailQueue";

async function sendEmail(job: AssignmentEmailJob) {
  console.log(
    `[email] To: ${job.assigneeEmail} | Subject: You were assigned "${job.taskTitle}"`
  );
  
  if (process.env.EMAIL_FAIL_MODE === "always") {
    throw new Error("Simulated SMTP failure");
  }
}

export const emailWorker = new Worker<AssignmentEmailJob>(
  EMAIL_QUEUE_NAME,
  async (job: Job<AssignmentEmailJob>) => {
    await sendEmail(job.data);
    return { sentAt: new Date().toISOString() };
  },
  {
    connection: redisConnection,
    limiter: { max: 50, duration: 60_000 },
  }
);

emailWorker.on("completed", (job) => {
  console.log(`[worker] job ${job.id} completed`);
});

emailWorker.on("failed", async (job, err) => {
  if (!job) return;
  console.error(`[worker] job ${job.id} failed (attempt ${job.attemptsMade}): ${err.message}`);

  if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
    await emailDlq.add("dead-letter", { ...job.data, failedReason: err.message });
    console.error(`[worker] job ${job.id} moved to dead-letter queue`);
  }
});