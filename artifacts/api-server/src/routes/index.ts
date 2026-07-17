import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";
import hevaRouter from "./heva";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/expenses", expensesRouter);
router.use(hevaRouter);

export default router;
