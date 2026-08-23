import { Router } from "express";
import * as controller from "./auth.controller";
import { authRateLimit } from "../../middleware/rateLimit";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.post("/register", authRateLimit, controller.register);
router.post("/login", authRateLimit, controller.login);
router.post("/refresh", authRateLimit, controller.refresh);
router.post("/logout", authRateLimit, controller.logout);
router.post("/logout-all", authRateLimit, requireAuth, controller.logoutAll);

export default router;