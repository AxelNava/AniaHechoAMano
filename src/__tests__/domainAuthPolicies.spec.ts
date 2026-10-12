import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/auth/authService";
import { CategoriesApi } from "@/services/categories/categoriesApi";
import { ClientesApi } from "@/services/clientes/clientesApi";
import { ProductHistoryApi } from "@/services/history/productHistoryApi";
import { OrdersApi } from "@/services/orders/ordersApi";
import { CatalogApi } from "@/services/products/catalogApi";
import { ComponentsApi } from "@/services/products/componentsApi";
import { ProductApi } from "@/services/products/productApi";
import type { ProductDto } from "@/types/products/ProductDto";

vi.mock("@/auth/authService", () => ({
  authService: { getAccessToken: vi.fn() },
}));

const tokenMock = vi.mocked(authService.getAccessToken);
const categories = new CategoriesApi();
const clientes = new ClientesApi();
const history = new ProductHistoryApi();
const orders = new OrdersApi();
const catalog = new CatalogApi();
const components = new ComponentsApi();
const products = new ProductApi();
const product = { id: 7 } as ProductDto;
const R = "required" as const;
const N = "none" as const;

type PolicyCase = [string, string, RegExp, typeof R | typeof N, () => Promise<unknown>];

const productOrderHistory = () => history.getOrdersByProduct(7);

const cases: PolicyCase[] = [
  ["category list", "GET", /\/categories$/, N, () => categories.getCategories()],
  ["category create", "POST", /\/categories\/new$/, R, () => categories.createCategories([])],
  ["client search", "GET", /\/clientes\?search=Ana$/, R, () => clientes.searchClientes("Ana")],
  ["product order history", "GET", /\/productos\/7\/pedidos\/historial$/, R, productOrderHistory],
  ["order detail", "GET", /\/pedidos\/8$/, R, () => history.getOrderById(8)],
  [
    "order snapshots",
    "GET",
    /\/pedidos\/8\/productos\/9\/componentes$/,
    R,
    () => history.getOrderProductComponents(8, 9),
  ],
  [
    "order snapshot detail",
    "GET",
    /\/pedidos\/8\/productos\/9\/componentes\/10$/,
    R,
    () => history.getOrderProductComponentById(8, 9, 10),
  ],
  ["global order history", "GET", /\/pedidos$/, R, () => orders.getAllOrders()],
  [
    "public tracking",
    "GET",
    /\/pedidos\/seguimiento\/track$/,
    N,
    () => orders.getSeguimiento("track"),
  ],
  ["manual order", "POST", /\/pedidos$/, R, () => orders.createOrder({ productos: [] })],
  [
    "public order",
    "POST",
    /\/pedidos\/solicitud$/,
    N,
    () => orders.createOrderPublico({ productos: [] }),
  ],
  [
    "authenticated public order",
    "POST",
    /\/pedidos\/solicitud-autenticada$/,
    R,
    () => orders.createOrderPublicoAutenticado({ productos: [] }),
  ],
  [
    "order image upload",
    "POST",
    /\/pedidos\/8\/productos\/9\/imagenes$/,
    R,
    () => orders.uploadModificacionImagenes(8, 9, []),
  ],
  ["order confirmation", "POST", /\/pedidos\/8\/confirmar$/, R, () => orders.confirmarPedido(8)],
  ["order quote", "POST", /\/pedidos\/8\/cotizar$/, R, () => orders.cotizarPedido(8, {} as never)],
  ["catalog", "GET", /\/productos\?activo=true$/, N, () => catalog.getCatalogProducts()],
  ["component list", "GET", /\/productos\/componentes$/, R, () => components.getComponentes()],
  [
    "component create",
    "POST",
    /\/productos\/componentes\/new$/,
    R,
    () => components.createComponentes({} as never),
  ],
  [
    "component update",
    "PATCH",
    /\/productos\/componentes\/7$/,
    R,
    () => components.updateComponente(7, {}),
  ],
  ["product list", "GET", /\/productos\/all$/, N, () => products.getProducts()],
  ["paginated products", "GET", /\/productos$/, N, () => products.getProductsPaginated()],
  ["product detail", "GET", /\/productos\/7$/, N, () => products.getProductById(7)],
  [
    "public order options",
    "GET",
    /\/productos\/7\/opciones-pedido$/,
    N,
    () => products.getProductOrderOptions(7),
  ],
  [
    "protected order info",
    "GET",
    /\/productos\/7\/info-pedido$/,
    R,
    () => products.getProductOrderInfo(7),
  ],
  ["product create", "POST", /\/productos\/new$/, R, () => products.createProduct(product)],
  [
    "multipart product create",
    "POST",
    /\/productos\/new$/,
    R,
    () => products.createProductWithImages(new FormData()),
  ],
  ["product update", "PATCH", /\/productos\/7$/, R, () => products.updateProduct(product)],
  [
    "multipart product update",
    "PATCH",
    /\/productos\/7$/,
    R,
    () => products.updateProductWithImages(7, new FormData()),
  ],
];

describe("domain API auth policies", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(cases)("uses %s policy", async (_, method, path, auth, invoke) => {
    tokenMock.mockReset().mockResolvedValue("domain-token");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    vi.stubGlobal("fetch", fetchMock);

    await invoke();

    const [url, options] = fetchMock.mock.calls[0];
    const headers = new Headers(options.headers);
    expect(String(url)).toMatch(path);
    expect(options.method).toBe(method);
    expect(headers.get("Authorization")).toBe(auth === R ? "Bearer domain-token" : null);
    expect(tokenMock).toHaveBeenCalledTimes(auth === R ? 1 : 0);
    if (options.body instanceof FormData) expect(headers.has("Content-Type")).toBe(false);
    if (auth === N && options.body) expect(headers.get("Content-Type")).toBe("application/json");
  });
});
