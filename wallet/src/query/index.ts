import type { ReqShareQuerystring, ReqShareResponse, ReqShareStorePayload } from "./payload";

const API_ENDPOINT = "localhost:8080";

async function createPostRequest<T, R>(path: string, payload: T): Promise<R> {
    const url = `http://${API_ENDPOINT}/${path}`;
    const ret = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify(payload),
    });

    return ret.json();
}

async function createGetRequest<R>(path: string, querystring: Object): Promise<R> {
    const qs = querystring ? Object.entries(querystring)
        .map(([key, value]) => `${key}=${String(value)}`)
        .join("&") : "";
    const url = `http://${API_ENDPOINT}/${path}?${qs}`;
    const ret = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
        },
        method: "GET",
    });

    return ret.json();
}

export async function reqShareStore(payload: ReqShareStorePayload): Promise<void> {
    await createPostRequest("/keyshare", payload);
}

export async function reqShare(querystring: ReqShareQuerystring): Promise<ReqShareResponse> {
    const resp = await createGetRequest<ReqShareResponse>("/keyshare", querystring);
    return resp;
}


