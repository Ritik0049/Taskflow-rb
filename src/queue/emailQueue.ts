import { Queue } from "bullmq";
import { redisConnection } from "../lib/redis";

export const EMAIL_QUEUE_NAME = "email-notifications";
export const EMAIL_DLQ_NAME = "email-notifications-dlq";

export interface AssignmentEmailJob {
  taskId: string;
  taskTitle: string;
  assigneeId: string;
  assigneeEmail: string;
  assigneeName: string;
  assignedByUserId: string;
}

export const emailQueue = new Queue<AssignmentEmailJob>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: false, 
    removeOnFail: false,     
  },
});

export const emailDlq = new Queue<AssignmentEmailJob & { failedReason: string }>(
  EMAIL_DLQ_NAME,
  { connection: redisConnection }
);