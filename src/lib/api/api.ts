import axios from "axios";
import { getAccessToken } from "@/lib/auth/cognito";

type DocumentType =
  | null
  | boolean
  | number
  | string
  | DocumentType[]
  | { [prop: string]: DocumentType };

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL! });

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = token;
  return config;
});

export async function apiGet(
  apiPath: string,
  queryParams?: Record<string, string>,
) {
  const res = await api.get(apiPath, { params: queryParams });
  return res.data;
}

export async function apiPost(apiPath: string, requestBody: DocumentType) {
  const res = await api.post(apiPath, requestBody);
  return res.data;
}

export async function apiPut(apiPath: string, requestBody: DocumentType) {
  const res = await api.put(apiPath, requestBody);
  return res.data;
}

export async function apiDelete(apiPath: string, requestBody?: DocumentType) {
  const res = await api.delete(apiPath, { data: requestBody });
  return res.data;
}
