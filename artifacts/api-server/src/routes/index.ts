import { Router, type IRouter } from "express";
import healthRouter from "./health";
import hevaRouter from "./heva";

const router: IRouter = Router();

router.use(healthRouter);
router.use(hevaRouter);

export default router;
