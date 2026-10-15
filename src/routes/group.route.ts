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
  markRoundSent,
  confirmRoundPayment,
  unconfirmRoundPayment,
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
// Member: "I've sent my payment" (notifies the admin; does not count as paid).
router.post("/:id/rounds/current/mark-paid", requireAuth, validateBody(markPaidSchema), markRoundSent);
// Group admin only.
router.post("/:id/rounds/current/confirm/:userId", requireAuth, confirmRoundPayment);
router.post("/:id/rounds/current/unconfirm/:userId", requireAuth, unconfirmRoundPayment);
router.get("/:id", requireAuth, getGroupById);

export default router;
