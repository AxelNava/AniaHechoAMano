const apiBackend = import.meta.env.VITE_VUE_APP_DOMAIN || "http://localhost:5001";
const api = `${apiBackend}/api`;

function defaultErrorHandler(reason: unknown) {
  console.error("Error fetching data:", reason);
}

export async function useFetch<T>(
  routeApi: string,
  fetchOptions?: RequestInit,
  errorFn?: (reason: unknown) => PromiseLike<never> | null | undefined,
): Promise<T | null> {
  const endpoint = `${api}/${routeApi}`;

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...fetchOptions?.headers,
    },
    ...fetchOptions,
  };

  try {
    const response = await fetch(endpoint, defaultOptions);
    return (await response.json()) as T;
  } catch (e) {
    if (errorFn) errorFn(e);
    else defaultErrorHandler(e);
    return null;
  }
}
