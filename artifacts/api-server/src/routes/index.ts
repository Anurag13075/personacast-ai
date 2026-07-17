import { Router, type IRouter } from "express";
import healthRouter from "./health";
import expensesRouter from "./expenses";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/expenses", expensesRouter);

export default router;
