import express from "express";

import { setKeyshareRoutes } from "./keyshare";

const router = express.Router();

setKeyshareRoutes(router);

export default router;
