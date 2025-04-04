import { Router } from "express";

import { appServerState } from "../state";

interface KeyShareStoreRequest {
  serverKeyshare: string;
}

interface KeyShareStoreResponse {
  isSuccess: boolean;
}

interface KeyShareResponse {
  serverKeyshare: string;
}


export function setKeyshareRoutes(router: Router) {
  router.post<{}, KeyShareStoreResponse, KeyShareStoreRequest>(
    "/keyshare",
    (req, res) => {
      try {
        const { serverState } = appServerState;

        serverState.serverKeyshare = req.body.serverKeyshare;

        res.json({ isSuccess: true });
      } catch (err) {
        console.error("Error on server: %s", err);
      }
    },
  );

  router.get<{}, KeyShareResponse>("/keyshare", (_req, res) => {
    try {
      // TODO: pubkey별로 저장하고 그에 따라 키쉐어 반환하는 방식으로 변환
      const { serverState } = appServerState;
      if (!serverState.serverKeyshare)
        throw new Error("not found server keyshare");

      res.json({ serverKeyshare: serverState.serverKeyshare });
    } catch (err) {
      console.error("Error on server: %s", err);
    }
  });
}
