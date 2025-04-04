export type WalletServerState = {
  serverActiveKeyshare: string | null;
};

function makeServerState(): WalletServerState {
  return {
    serverActiveKeyshare: null,
  };
}

export const appServerState: AppServerState = (() => {
  const serverState = makeServerState();

  return {
    serverState,
  };
})();

export interface AppServerState {
  serverState: WalletServerState;
}