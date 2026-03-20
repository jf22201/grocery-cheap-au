import { get, post, put, del } from "aws-amplify/api";
type DocumentType =
  | null
  | boolean
  | number
  | string
  | DocumentType[]
  | {
      [prop: string]: DocumentType;
    };

const API_NAME = "grocery-tracker-api";
export async function apiGet(
  apiPath: string,
  queryParams?: Record<string, string>,
) {
  const { body } = await get({
    apiName: API_NAME,
    path: apiPath,
    options: {
      queryParams,
    },
  }).response;
  return body.json();
}

export async function apiPut(apiPath: string, requestBody: DocumentType) {
  const { body } = await put({
    apiName: API_NAME,
    path: apiPath,
    options: {
      body: requestBody,
    },
  }).response;
  return body.json();
}

export async function apiDelete(apiPath: string, requestBody?: DocumentType) {
  const { body } = await del({
    apiName: API_NAME,
    path: apiPath,
    options: requestBody
      ? {
          body: requestBody,
        }
      : undefined,
  }).response;
  return body.json();
}

export async function apiPost(apiPath: string, requestBody: DocumentType) {
  const { body } = await post({
    apiName: API_NAME,
    path: apiPath,
    options: {
      body: requestBody,
    },
  }).response;
  return body.json();
}
