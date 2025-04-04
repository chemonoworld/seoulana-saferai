export type EWalletServerState = {
  serverKeyshare: string | null;
};

function makeServerState(): EWalletServerState {
  return {
    serverKeyshare: null,
  };
}

export const appServerState: AppServerState = (() => {
  const serverState = makeServerState();

  return {
    serverState,
  };
})();

export interface AppServerState {
  serverState: EWalletServerState;
}