import discussionController from "../controller/discussion.controller";
import { auth } from "../middleware/auth";
import { Router } from "express";

const router = Router();

router.post("/",auth,discussionController.post)
router.put("/:id",auth,discussionController.edit)
router.get("/",discussionController.getAll)
router.delete("/:id",auth,discussionController.delete)
router.get("/me", auth,discussionController.getMyDiscussions);
router.put("/:id/favourite",auth ,discussionController.toggleFavourite);
router.post("/comment",auth ,discussionController.comment);
router.get("/comments/:discussionId" ,discussionController.getCommentByDiscussion);
router.put("/comment/:id",auth ,discussionController.editComment);
router.delete("/comment/:id", auth,discussionController.deleteComment);



export default router