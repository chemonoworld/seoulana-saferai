import express from "express";

import { setKeyshareRoutes } from "./keyshare";
import { setAgentRoutes } from './agent';

const router = express.Router();

setKeyshareRoutes(router);
setAgentRoutes(router);

export default router;
