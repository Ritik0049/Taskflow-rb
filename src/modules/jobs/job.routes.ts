import { Router, Request, Response, NextFunction } from "express";
import { emailQueue } from "../../queue/emailQueue";
import { requireAuth } from "../../middleware/auth";
import { NotFound } from "../../lib/error";

const router = Router();
router.use(requireAuth);

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await emailQueue.getJob(String(req.params.id));
    if (!job) throw NotFound("Job", "JOB_NOT_FOUND");

    const state = await job.getState();
    const statusMap: Record<string, string> = {
      waiting: "pending",
      delayed: "pending",
      active: "active",
      completed: "completed",
      failed: "failed",
    };

    res.json({
      id: job.id,
      status: statusMap[state] ?? state,
      attemptsMade: job.attemptsMade,
      maxAttempts: job.opts.attempts,
      data: job.data,
      failedReason: job.failedReason ?? null,
      createdAt: new Date(job.timestamp).toISOString(),
      processedAt: job.processedOn ? new Date(job.processedOn).toISOString() : null,
      finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    });
  } catch (e) {
    next(e);
  }
});

export default router;