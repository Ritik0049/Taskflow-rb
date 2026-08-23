import { Router } from "express";
import * as controller from "./task.controller";
import { requireAuth } from "../../middleware/auth";

const router = Router();

router.use(requireAuth);

router.get("/", controller.list);
router.post("/", controller.create);
router.get("/:id", controller.get);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);
router.post("/:id/assign", controller.assign);
router.delete("/:id/assign/:userId", controller.unassign);

export default router;