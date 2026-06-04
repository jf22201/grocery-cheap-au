import { getAccessToken } from "@/lib/auth/cognito";

type DocumentType =
  | null
  | boolean
  | number
  | string
  | DocumentType[]
  | { [prop: string]: DocumentType };

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return token ? { Authorization: token } : {};
}

export async function apiGet(
  apiPath: string,
  queryParams?: Record<string, string>,
) {
  const url = new URL(apiPath, API_URL);
  if (queryParams) {
    Object.entries(queryParams).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), { headers: await authHeaders() });
  return res.json();
}

export async function apiPost(apiPath: string, requestBody: DocumentType) {
  const res = await fetch(new URL(apiPath, API_URL).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(requestBody),
  });
  return res.json();
}

export async function apiPut(apiPath: string, requestBody: DocumentType) {
  const res = await fetch(new URL(apiPath, API_URL).toString(), {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(requestBody),
  });
  return res.json();
}

export async function apiDelete(apiPath: string, requestBody?: DocumentType) {
  const res = await fetch(new URL(apiPath, API_URL).toString(), {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    ...(requestBody ? { body: JSON.stringify(requestBody) } : {}),
  });
  return res.json();
}
