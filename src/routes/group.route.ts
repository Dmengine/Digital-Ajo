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
  getCurrentRoundHandler,
  markRoundPaid,
  confirmRoundPayment,
  disputeRoundPayment,
} from "../controller/group.controller";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import {
  createGroupSchema,
  joinGroupSchema,
  postGroupMessageSchema,
  addGroupMemberSchema,
  markPaidSchema,
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
router.get("/:id/rounds/current", requireAuth, getCurrentRoundHandler);
router.post("/:id/rounds/current/mark-paid", requireAuth, validateBody(markPaidSchema), markRoundPaid);
router.post("/:id/rounds/current/confirm/:userId", requireAuth, confirmRoundPayment);
router.post("/:id/rounds/current/dispute/:userId", requireAuth, disputeRoundPayment);
router.get("/:id", requireAuth, getGroupById);

export default router;
