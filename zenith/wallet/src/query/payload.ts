export interface ReqShareStorePayload {
    serverActiveKeyshare: string;
}

export interface ReqShareQuerystring {
    pubkey: string;
}

export interface ReqShareResponse {
    serverActiveKeyshare: string;
}
