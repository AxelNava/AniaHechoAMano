import { request, type RequestAuth } from "@/services/http/apiClient";

function defaultErrorHandler(reason: unknown) {
  console.error("Error fetching data:", reason);
}

export type UseFetchOptions = RequestInit & { auth?: RequestAuth };

export async function useFetch<T>(
  routeApi: string,
  fetchOptions: UseFetchOptions = {},
  errorFn?: (reason: unknown) => PromiseLike<never> | null | undefined,
): Promise<T | null> {
  const { auth = "none", ...requestOptions } = fetchOptions;
  const headers = new Headers(requestOptions.headers);
  if (typeof requestOptions.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    return await request<T>(routeApi, { ...requestOptions, headers, auth });
  } catch (error) {
    if (errorFn) errorFn(error);
    else defaultErrorHandler(error);
    return null;
  }
}
