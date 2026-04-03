import { Router } from "express";
import {
  createGroup,
  getGroupById,
  browseOpenGroups,
  joinGroupByInvite,
} from "../controller/group.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createGroupSchema, joinGroupSchema } from "../validators/group.validators";

const router = Router();

router.get("/browse", requireAuth, browseOpenGroups);
router.post("/join", requireAuth, validateBody(joinGroupSchema), joinGroupByInvite);
router.post("/", requireAuth, validateBody(createGroupSchema), createGroup);
router.get("/:id", requireAuth, getGroupById);

export default router;
