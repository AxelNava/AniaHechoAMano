import { inject, ref, type App, type InjectionKey, type Ref } from "vue";

type AsyncState<TData> = {
  data: Ref<TData>;
  loading: Ref<boolean>;
  error: Ref<unknown>;
  execute: (promiseFactory: () => Promise<TData>) => Promise<TData>;
};

type AsyncPromisePluginApi = {
  createState: <TData>(initialData: TData) => AsyncState<TData>;
};

const ASYNC_PROMISE_KEY: InjectionKey<AsyncPromisePluginApi> = Symbol("async-promise");

function createState<TData>(initialData: TData): AsyncState<TData> {
  const data = ref(initialData) as Ref<TData>;
  const loading = ref(false);
  const error = ref<unknown>(null);

  const execute = async (promiseFactory: () => Promise<TData>): Promise<TData> => {
    loading.value = true;
    error.value = null;

    try {
      const result = await promiseFactory();
      data.value = result;
      return result;
    } catch (err) {
      error.value = err;
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    data,
    loading,
    error,
    execute,
  };
}

export const asyncPromisePlugin = {
  install(app: App) {
    app.provide(ASYNC_PROMISE_KEY, {
      createState,
    });
  },
};

export function useAsyncPromiseLoading<TData>(initialData: TData): AsyncState<TData> {
  const pluginApi = inject(ASYNC_PROMISE_KEY);

  if (!pluginApi) {
    throw new Error("Async promise plugin is not installed");
  }

  return pluginApi.createState(initialData);
}
