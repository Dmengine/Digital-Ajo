import { Router } from "express";
import {
  createGroup,
  getGroupById,
  browseOpenGroups,
  joinGroupByInvite,
  getGroupDashboard,
  getGroupMessages,
  postGroupMessage,
  addGroupMember,
  removeGroupMember,
} from "../controller/group.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  createGroupSchema,
  joinGroupSchema,
  postGroupMessageSchema,
  addGroupMemberSchema,
} from "../validators/group.validators";

const router = Router();

router.get("/browse", requireAuth, browseOpenGroups);
router.post("/join", requireAuth, validateBody(joinGroupSchema), joinGroupByInvite);
router.post("/", requireAuth, validateBody(createGroupSchema), createGroup);
router.get("/:id/dashboard", requireAuth, getGroupDashboard);
router.get("/:id/messages", requireAuth, getGroupMessages);
router.post("/:id/messages", requireAuth, validateBody(postGroupMessageSchema), postGroupMessage);
router.post("/:id/members", requireAuth, validateBody(addGroupMemberSchema), addGroupMember);
router.delete("/:id/members/:userId", requireAuth, removeGroupMember);
router.get("/:id", requireAuth, getGroupById);

export default router;
