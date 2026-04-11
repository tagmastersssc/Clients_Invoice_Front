import { useCallback, useEffect, useState } from "react";
import InputField from "./components/InputField";
import logo from "/bilailogocompleto.png";
import logoicon from "/bilailogo.svg";
import { getRuntimeEnv } from "./runtimeConfig";

const LOGIN_APP_URL = getRuntimeEnv("VITE_LOGIN_APP_URL", "/login");
const API_URL = getRuntimeEnv("VITE_API_URL", "/api").replace(/\/+$/, "");
const LEGACY_SESSION_KEYS = ["token", "user_email", "user_first_name", "user_last_name", "user_name"];
let portalCsrfToken = "";

const setPortalCsrfToken = (value) => {
  portalCsrfToken = typeof value === "string" ? value.trim() : "";
};

const VIEWS = {
  HOME: "home",
  REGISTER_SALE_MENU: "register-sale",
  ELECTRONIC_INVOICE: "electronic-invoice",
  GENERIC_INVOICE: "generic-invoice",
  SALES: "sales",
  INVENTORY: "inventory",
  DASHBOARDS: "dashboards",
  CLIENTS: "clients",
  TRANSACTIONS: "transactions",
  REPORTS: "reports",
  SETTINGS: "settings",
};

const NAV_ITEMS = [
  { label: "Inicio", icon: "home", view: VIEWS.HOME },
  { label: "Ventas", icon: "insights", view: VIEWS.SALES },
  { label: "Inventario", icon: "inventory_2", view: VIEWS.INVENTORY },
  { label: "Dashboards", icon: "query_stats", view: VIEWS.DASHBOARDS },
  { label: "Clientes", icon: "group", view: VIEWS.CLIENTS },
  { label: "Transacciones", icon: "receipt_long", view: VIEWS.TRANSACTIONS },
  { label: "Reportes", icon: "monitoring", view: VIEWS.REPORTS },
  { label: "Configuraciones", icon: "settings", view: VIEWS.SETTINGS },
];

const VIEW_META = {
  [VIEWS.HOME]: {
    title: "Inicio",
    description: "Accede rápidamente a las funciones más usadas y mantén tu operación bajo control.",
  },
  [VIEWS.DASHBOARDS]: {
    title: "Dashboards",
    description: "Visualiza métricas clave y detecta tendencias con un vistazo.",
  },
  [VIEWS.CLIENTS]: {
    title: "Clientes",
    description: "Gestiona tu cartera, conoce su salud y detecta oportunidades.",
  },
  [VIEWS.TRANSACTIONS]: {
    title: "Transacciones",
    description: "Monitorea cada movimiento en tiempo real para mantener tu cashflow saludable.",
  },
  [VIEWS.REPORTS]: {
    title: "Reportes",
    description: "Genera reportes estratégicos y comparte resultados con tu equipo.",
  },
  [VIEWS.SETTINGS]: {
    title: "Configuraciones",
    description: "Personaliza BilAI para que funcione igual que tu negocio.",
  },
  [VIEWS.REGISTER_SALE_MENU]: {
    title: "Registrar venta",
    description: "Elige el tipo de factura que mejor se ajusta a tu operación.",
  },
  [VIEWS.ELECTRONIC_INVOICE]: {
    title: "Factura electrónica",
    description: "Completa los datos fiscales clave para emitir un comprobante válido.",
  },
  [VIEWS.GENERIC_INVOICE]: {
    title: "Factura genérica",
    description: "Registra ventas rápidas con los datos esenciales.",
  },
  [VIEWS.SALES]: {
    title: "Ventas",
    description: "Consulta el rendimiento comercial y detecta oportunidades de crecimiento.",
  },
  [VIEWS.INVENTORY]: {
    title: "Inventario",
    description: "Visualiza existencias, rotación y alertas en un solo lugar.",
  },
};

const MONTH_LABELS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(toNumber(value));

const formatInteger = (value) => new Intl.NumberFormat("es-CO").format(Math.round(toNumber(value)));

const formatSignedPercent = (value) => {
  const numeric = toNumber(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}%`;
};

const buildApiUrl = (path) => {
  const baseOrigin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "https://example.com";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`${API_URL}${normalizedPath}`, baseOrigin).toString();
};

const requestPortalApi = async (path, { method = "GET", query = {}, body } = {}) => {
  const url = new URL(buildApiUrl(path));
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = {};
  const normalizedMethod = method.toUpperCase();

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(normalizedMethod) && portalCsrfToken) {
    headers["X-CSRF-Token"] = portalCsrfToken;
  }

  const response = await fetch(url.toString(), {
    method: normalizedMethod,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const rawText = await response.text();
  let payload = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = { raw: rawText };
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Tu sesión expiró. Inicia sesión nuevamente.");
    }

    const detail =
      payload && typeof payload.detail === "string"
        ? payload.detail
        : payload && typeof payload.raw === "string"
          ? payload.raw
          : "No fue posible completar la operación.";
    throw new Error(detail);
  }

  return payload;
};

const parseMetricsPayload = (payload) => {
  const totalInvoices = toNumber(payload?.TotalInvoices);
  const totalCreditNotes = toNumber(payload?.TotalCreditNotes);
  const totalDebitNotes = toNumber(payload?.TotalDebitNotes);
  const totalValueInvoices = toNumber(payload?.TotalValueInvoices);
  const totalValueCreditNotes = toNumber(payload?.TotalValueCreditNotes);
  const totalValueDebitNotes = toNumber(payload?.TotalValueDebitNotes);
  const netSales = totalValueInvoices + totalValueDebitNotes - totalValueCreditNotes;
  const totalDocuments = totalInvoices + totalCreditNotes + totalDebitNotes;
  const averageTicket = totalInvoices > 0 ? totalValueInvoices / totalInvoices : 0;

  return {
    totalInvoices,
    totalCreditNotes,
    totalDebitNotes,
    totalValueInvoices,
    totalValueCreditNotes,
    totalValueDebitNotes,
    netSales,
    totalDocuments,
    averageTicket,
  };
};

const buildMonthPeriod = (date) => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
});

const getCurrentMonthPeriod = () => buildMonthPeriod(new Date());

const getPreviousMonthPeriod = (period) => {
  const monthIndex = period.month - 2;
  const date = new Date(period.year, monthIndex, 1);
  return buildMonthPeriod(date);
};

const getPeriodLabel = (period) => {
  const monthLabel = MONTH_LABELS[(period.month ?? 1) - 1] || "mes";
  return `${monthLabel} ${period.year}`;
};

const calculateTrend = (currentValue, previousValue) => {
  const current = toNumber(currentValue);
  const previous = toNumber(previousValue);
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
};

const buildSalesBreakdownRows = (metrics) => {
  const rows = [
    {
      id: "invoices",
      type: "Facturas",
      count: metrics.totalInvoices,
      value: metrics.totalValueInvoices,
      status: metrics.totalInvoices > 0 ? "Activas" : "Sin registros",
      statusClass: metrics.totalInvoices > 0 ? "status-pill--success" : "status-pill--info",
    },
    {
      id: "credit-notes",
      type: "Notas crédito",
      count: metrics.totalCreditNotes,
      value: metrics.totalValueCreditNotes,
      status: metrics.totalCreditNotes > 0 ? "Aplicadas" : "Sin registros",
      statusClass: metrics.totalCreditNotes > 0 ? "status-pill--warning" : "status-pill--info",
    },
    {
      id: "debit-notes",
      type: "Notas débito",
      count: metrics.totalDebitNotes,
      value: metrics.totalValueDebitNotes,
      status: metrics.totalDebitNotes > 0 ? "Aplicadas" : "Sin registros",
      statusClass: metrics.totalDebitNotes > 0 ? "status-pill--success" : "status-pill--info",
    },
  ];

  return rows.map((row) => ({
    ...row,
    ratio:
      metrics.netSales > 0
        ? `${((toNumber(row.value) / metrics.netSales) * 100).toFixed(1)}%`
        : "0.0%",
  }));
};


const normalizeInvoiceItems = (products, { includeTaxType }) =>
  products.map((item) => ({
    product: item.product.trim(),
    quantity: Number(item.quantity),
    price: Number(item.price),
    ...(includeTaxType ? { tax_type_id: item.taxType || null } : {}),
  }));

const capitalizeName = (value) => {
  if (!value) return "";
  const lower = value.trim();
  if (!lower) return "";
  return lower.charAt(0).toUpperCase() + lower.slice(1).toLowerCase();
};

const deriveDisplayName = (email) => {
  if (!email) return "Usuario";
  const [namePart] = email.split("@");
  const formatted = namePart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
  return formatted || "Usuario";
};

const formatUserName = (firstName, lastName, email) => {
  const primary = firstName?.split(" ")[0] ?? "";
  const secondary = lastName?.split(" ")[0] ?? "";
  const parts = [capitalizeName(primary), capitalizeName(secondary)].filter(Boolean);
  if (parts.length) {
    return parts.join(" ");
  }
  return deriveDisplayName(email);
};

const getInitial = (name, fallback) => {
  if (name && name.trim()) {
    return name.trim().charAt(0).toUpperCase();
  }
  if (fallback && fallback.trim()) {
    return fallback.trim().charAt(0).toUpperCase();
  }
  return "U";
};

const clearStoredSession = () => {
  setPortalCsrfToken("");
  if (typeof window === "undefined") {
    return;
  }

  LEGACY_SESSION_KEYS.forEach((key) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  });
};

const stripLegacySessionParams = () => {
  if (typeof window === "undefined") {
    return;
  }

  const searchParams = new URLSearchParams(window.location.search);
  let hasLegacyParams = false;
  ["token", "email", "firstName", "lastName"].forEach((key) => {
    if (searchParams.has(key)) {
      searchParams.delete(key);
      hasLegacyParams = true;
    }
  });

  if (!hasLegacyParams) {
    return;
  }

  const cleanQuery = searchParams.toString();
  const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);
};

const normalizeSessionUser = (payload) => {
  const user =
    payload && typeof payload.user === "object" && payload.user !== null ? payload.user : payload;

  if (!user || typeof user !== "object") {
    return null;
  }

  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (!email) {
    return null;
  }

  const firstName = typeof user.firstName === "string" ? user.firstName.trim() : "";
  const lastName = typeof user.lastName === "string" ? user.lastName.trim() : "";
  const providedName = typeof user.name === "string" ? user.name.trim() : "";

  return {
    email,
    firstName,
    lastName,
    name: providedName || formatUserName(firstName, lastName, email),
    provider: typeof user.provider === "string" ? user.provider.trim() : "",
  };
};

const generateRowId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

const createProductRow = () => ({
  id: generateRowId(),
  product: "",
  quantity: "",
  price: "",
  taxType: "",
});

const validateProductRows = (products, { requireTaxType = false } = {}) => {
  const rowErrors = products.map(() => ({}));
  let hasErrors = false;

  products.forEach((item, index) => {
    const currentErrors = rowErrors[index];
    const productName = (item.product ?? "").trim();
    if (!productName) {
      currentErrors.product = "Describe el producto.";
      hasErrors = true;
    }

    const quantityRaw = item.quantity ?? "";
    const quantityValue = Number(quantityRaw);
    if (!quantityRaw) {
      currentErrors.quantity = "Indica la cantidad.";
      hasErrors = true;
    } else if (Number.isNaN(quantityValue) || quantityValue <= 0) {
      currentErrors.quantity = "La cantidad debe ser mayor a cero.";
      hasErrors = true;
    }

    const priceRaw = item.price ?? "";
    const priceValue = Number(priceRaw);
    if (!priceRaw) {
      currentErrors.price = "Indica el precio.";
      hasErrors = true;
    } else if (Number.isNaN(priceValue) || priceValue <= 0) {
      currentErrors.price = "El precio debe ser mayor a cero.";
      hasErrors = true;
    }

    if (requireTaxType && !item.taxType) {
      currentErrors.taxType = "Selecciona el tipo de impuesto.";
      hasErrors = true;
    }
  });

  return { errors: rowErrors, hasErrors };
};

const InvoiceProductsTable = ({
  products,
  errors = [],
  includeTaxType,
  onProductChange,
  onAddProduct,
  onRemoveProduct,
}) => (
  <div className="invoice-table-wrapper">
    <table className="invoice-table">
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio</th>
          {includeTaxType && <th>Impuesto</th>}
          <th className="table-actions-header">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {products.map((item, index) => {
          const rowErrors = errors[index] || {};
          return (
            <tr key={item.id}>
              <td data-label="Producto">
                <div className={`table-input-wrapper${rowErrors.product ? " has-error" : ""}`}>
                  <input
                    type="text"
                    className="table-input"
                    placeholder="Descripción del producto"
                    value={item.product}
                    onChange={(event) => onProductChange(index, "product", event.target.value)}
                    autoComplete="off"
                  />
                  {rowErrors.product && <p className="input-error">{rowErrors.product}</p>}
                </div>
              </td>
              <td data-label="Cantidad">
                <div className={`table-input-wrapper${rowErrors.quantity ? " has-error" : ""}`}>
                  <input
                    type="number"
                    className="table-input"
                    placeholder="0"
                    value={item.quantity}
                    onChange={(event) => onProductChange(index, "quantity", event.target.value)}
                    min="0"
                    step="1"
                    inputMode="numeric"
                  />
                  {rowErrors.quantity && <p className="input-error">{rowErrors.quantity}</p>}
                </div>
              </td>
              <td data-label="Precio">
                <div className={`table-input-wrapper${rowErrors.price ? " has-error" : ""}`}>
                  <input
                    type="number"
                    className="table-input"
                    placeholder="0.00"
                    value={item.price}
                    onChange={(event) => onProductChange(index, "price", event.target.value)}
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                  />
                  {rowErrors.price && <p className="input-error">{rowErrors.price}</p>}
                </div>
              </td>
              {includeTaxType && (
                <td data-label="Impuesto">
                  <div
                    className={`table-input-wrapper select${rowErrors.taxType ? " has-error" : ""}`}
                  >
                    <select
                      value={item.taxType}
                      onChange={(event) => onProductChange(index, "taxType", event.target.value)}
                    >
                      <option value="">Tipo de impuesto</option>
                      <option value="iva19">IVA 19%</option>
                      <option value="iva5">IVA 5%</option>
                      <option value="exento">Exento</option>
                    </select>
                    {rowErrors.taxType && <p className="input-error">{rowErrors.taxType}</p>}
                  </div>
                </td>
              )}
              <td className="table-actions" data-label="Acciones">
                <button
                  type="button"
                  className="table-remove-button"
                  onClick={() => onRemoveProduct(index)}
                  disabled={products.length === 1}
                  aria-label={`Eliminar producto ${index + 1}`}
                >
                  <span className="material-symbols-rounded">delete</span>
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <button type="button" className="table-add-button" onClick={onAddProduct}>
      <span className="material-symbols-rounded">add</span>
      Agregar producto
    </button>
  </div>
);

const HomeView = ({
  onRegisterSale,
  onViewSales,
  onInventory,
  feedback,
  metrics,
  metricsPrevious,
  metricsPeriod,
  metricsLoading,
  metricsError,
  onRefreshMetrics,
}) => {
  const trend = calculateTrend(metrics?.netSales, metricsPrevious?.netSales);
  const trendLabel =
    toNumber(metricsPrevious?.netSales) > 0
      ? `${formatSignedPercent(trend)} vs mes anterior`
      : "Sin periodo comparativo";
  const trendCopy = trend >= 0 ? "Crecimiento saludable" : "Caída frente al mes anterior";

  return (
    <section className="home-view" aria-labelledby="home-heading">
      <div className="home-hero">
        <div className="home-hero-text">
          <p className="section-kicker">Tu operación al día</p>
          <h2 id="home-heading">Impulsa tus ventas con BilAI</h2>
          <p>
            Automatiza tus procesos comerciales, mantén visibilidad absoluta de tus números
            y toma decisiones con confianza.
          </p>
          <div className="home-hero-actions">
            <button type="button" className="primary-button" onClick={onRegisterSale}>
              <span className="material-symbols-rounded">point_of_sale</span>
              Registrar venta
            </button>
            <button type="button" className="ghost-button" onClick={onViewSales}>
              <span className="material-symbols-rounded">insights</span>
              Ver ventas
            </button>
          </div>
        </div>
        <div className="home-hero-card">
          <p>Resumen de {getPeriodLabel(metricsPeriod)}</p>
          <h3>{formatCurrency(metrics?.netSales)}</h3>
          <span>{trendLabel}</span>
          <div className="trend-chip">
            <span className="material-symbols-rounded">
              {trend >= 0 ? "trending_up" : "trending_down"}
            </span>
            {trendCopy}
          </div>
          <button type="button" className="link-button" onClick={onRefreshMetrics} disabled={metricsLoading}>
            {metricsLoading ? "Actualizando..." : "Actualizar métricas"}
          </button>
        </div>
      </div>
      <div className="home-grid">
        <button type="button" className="home-tile" onClick={onRegisterSale}>
          <span className="material-symbols-rounded home-tile-icon">rocket_launch</span>
          <div>
            <h3>Registrar Venta</h3>
            <p>Captura cada oportunidad y sincroniza tus inventarios al instante.</p>
          </div>
        </button>
        <button type="button" className="home-tile" onClick={onViewSales}>
          <span className="material-symbols-rounded home-tile-icon">query_stats</span>
          <div>
            <h3>Ver ventas</h3>
            <p>Analiza tendencias, compara periodos y detecta productos estrella.</p>
          </div>
        </button>
        <button type="button" className="home-tile" onClick={onInventory}>
          <span className="material-symbols-rounded home-tile-icon">inventory_2</span>
          <div>
            <h3>Inventario</h3>
            <p>Controla existencias críticas y recibe alertas antes de que falte stock.</p>
          </div>
        </button>
      </div>
      {feedback && <p className="home-feedback">{feedback}</p>}
      {metricsError && <p className="home-feedback">{metricsError}</p>}
    </section>
  );
};

const SalesView = ({ metrics, metricsPrevious, metricsPeriod, metricsLoading, metricsError, onRefreshMetrics }) => {
  const trend = calculateTrend(metrics?.netSales, metricsPrevious?.netSales);
  const invoicesTrend = calculateTrend(metrics?.totalInvoices, metricsPrevious?.totalInvoices);
  const rows = buildSalesBreakdownRows(metrics);
  const trendClass = trend >= 0 ? "status-pill--success" : "status-pill--danger";
  const invoicesTrendClass = invoicesTrend >= 0 ? "status-pill--info" : "status-pill--warning";

  return (
    <section className="sales-view" aria-labelledby="sales-heading">
      <div className="view-header">
        <div>
          <p className="section-kicker">Rendimiento comercial</p>
          <h2 id="sales-heading">Ventas con contexto de negocio</h2>
          <p>Analiza resultados reales de facturación y notas para {getPeriodLabel(metricsPeriod)}.</p>
        </div>
        <div className="view-header-actions">
          <button type="button" className="ghost-button">
            <span className="material-symbols-rounded">calendar_today</span>
            {getPeriodLabel(metricsPeriod)}
          </button>
          <button type="button" className="primary-button" onClick={onRefreshMetrics} disabled={metricsLoading}>
            <span className="material-symbols-rounded">sync</span>
            {metricsLoading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </div>

      <div className="performance-grid">
        <article className="performance-card">
          <p>Ventas netas del periodo</p>
          <h3>{formatCurrency(metrics?.netSales)}</h3>
          <span className={`status-pill ${trendClass}`}>{formatSignedPercent(trend)} vs mes anterior</span>
        </article>
        <article className="performance-card">
          <p>Ticket promedio</p>
          <h3>{formatCurrency(metrics?.averageTicket)}</h3>
          <span className="status-pill status-pill--info">
            {formatInteger(metrics?.totalInvoices)} facturas emitidas
          </span>
        </article>
        <article className="performance-card">
          <p>Documentos procesados</p>
          <h3>{formatInteger(metrics?.totalDocuments)}</h3>
          <span className={`status-pill ${invoicesTrendClass}`}>
            {formatSignedPercent(invoicesTrend)} variación en facturas
          </span>
        </article>
      </div>

      <div className="panel-table panel-table--sales">
        <div className="panel-table-head panel-table-head--sales">
          <span>Tipo</span>
          <span>Cantidad</span>
          <span>Valor</span>
          <span>Participación</span>
          <span>Estado</span>
        </div>
        {rows.map((row) => (
          <div className="panel-table-row panel-table-row--sales" key={row.id}>
            <span className="panel-strong" data-label="Tipo">
              {row.type}
            </span>
            <span data-label="Cantidad">{formatInteger(row.count)}</span>
            <span className="panel-strong" data-label="Valor">
              {formatCurrency(row.value)}
            </span>
            <span data-label="Participación">{row.ratio}</span>
            <span className={`status-pill panel-status-cell ${row.statusClass}`} data-label="Estado">
              {row.status}
            </span>
          </div>
        ))}
      </div>
      {metricsError && <p className="home-feedback">{metricsError}</p>}
    </section>
  );
};

const InventoryView = () => {
  const products = [
    {
      name: "Cámara Web Pro",
      sku: "CW-4902",
      stock: "26",
      rotation: "Alta",
      status: "Óptimo",
      statusClass: "status-pill--success",
    },
    {
      name: "Teclado Mecánico K2",
      sku: "TK-1120",
      stock: "8",
      rotation: "Media",
      status: "Bajo stock",
      statusClass: "status-pill--warning",
    },
    {
      name: "Mouse Inalámbrico MX",
      sku: "MS-7744",
      stock: "42",
      rotation: "Alta",
      status: "Óptimo",
      statusClass: "status-pill--success",
    },
    {
      name: "Hub USB-C 7 en 1",
      sku: "HB-3198",
      stock: "5",
      rotation: "Alta",
      status: "Crítico",
      statusClass: "status-pill--danger",
    },
  ];

  return (
    <section className="inventory-view" aria-labelledby="inventory-heading">
      <div className="view-header">
        <div>
          <p className="section-kicker">Control de existencias</p>
          <h2 id="inventory-heading">Inventario con alertas accionables</h2>
          <p>Visualiza disponibilidad, rotación y productos que requieren reposición.</p>
        </div>
        <div className="view-header-actions">
          <button type="button" className="ghost-button">
            <span className="material-symbols-rounded">qr_code_scanner</span>
            Escanear SKU
          </button>
          <button type="button" className="primary-button">
            <span className="material-symbols-rounded">add</span>
            Nuevo producto
          </button>
        </div>
      </div>

      <div className="performance-grid">
        <article className="performance-card">
          <p>Productos activos</p>
          <h3>428</h3>
          <span className="status-pill status-pill--success">95% disponibles</span>
        </article>
        <article className="performance-card">
          <p>Valor inventario</p>
          <h3>$94,320</h3>
          <span className="status-pill status-pill--info">Actualizado hoy</span>
        </article>
        <article className="performance-card">
          <p>Alertas de stock</p>
          <h3>13</h3>
          <span className="status-pill status-pill--warning">5 críticas</span>
        </article>
      </div>

      <div className="panel-table panel-table--inventory">
        <div className="panel-table-head panel-table-head--inventory">
          <span>Producto</span>
          <span>SKU</span>
          <span>Stock</span>
          <span>Rotación</span>
          <span>Estado</span>
        </div>
        {products.map((item) => (
          <div className="panel-table-row panel-table-row--inventory" key={item.sku}>
            <div className="panel-product panel-product-cell" data-label="Producto">
              <span className="panel-product-avatar" aria-hidden="true">
                {item.name.charAt(0)}
              </span>
              <div>
                <strong>{item.name}</strong>
                <p>Última entrada: hace 2 días</p>
              </div>
            </div>
            <span data-label="SKU">{item.sku}</span>
            <span className="panel-strong" data-label="Stock">
              {item.stock}
            </span>
            <span data-label="Rotación">{item.rotation}</span>
            <span className={`status-pill panel-status-cell ${item.statusClass}`} data-label="Estado">
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};

const DashboardsView = ({
  metrics,
  metricsPrevious,
  metricsPeriod,
  metricsLoading,
  metricsError,
  onRefreshMetrics,
}) => {
  const netTrend = calculateTrend(metrics?.netSales, metricsPrevious?.netSales);
  const invoiceTrend = calculateTrend(metrics?.totalInvoices, metricsPrevious?.totalInvoices);
  const adjustmentValue = toNumber(metrics?.totalValueDebitNotes) - toNumber(metrics?.totalValueCreditNotes);

  return (
    <section className="dashboards-view" aria-labelledby="dashboards-heading">
      <div className="view-header">
        <div>
          <p className="section-kicker">Visión ejecutiva</p>
          <h2 id="dashboards-heading">Métricas que cuentan la historia completa</h2>
          <p>Monitorea tus ingresos reales y el balance documental de {getPeriodLabel(metricsPeriod)}.</p>
        </div>
        <button type="button" className="ghost-button" onClick={onRefreshMetrics} disabled={metricsLoading}>
          <span className="material-symbols-rounded">sync</span>
          {metricsLoading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>
      <div className="metrics-grid">
        <article className="metric-card">
          <span className="metric-label">Ingresos netos del mes</span>
          <h3>{formatCurrency(metrics?.netSales)}</h3>
          <p>{formatSignedPercent(netTrend)} frente al mes anterior</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Facturas emitidas</span>
          <h3>{formatInteger(metrics?.totalInvoices)}</h3>
          <p>{formatSignedPercent(invoiceTrend)} variación mensual</p>
        </article>
        <article className="metric-card">
          <span className="metric-label">Balance de ajustes</span>
          <h3>{formatCurrency(adjustmentValue)}</h3>
          <p>Notas débito menos notas crédito</p>
        </article>
      </div>
      <div className="chart-card">
        <div className="chart-header">
          <h3>Desglose documental</h3>
          <span className="chart-chip">Periodo: {getPeriodLabel(metricsPeriod)}</span>
        </div>
        <div className="chart-placeholder">
          <span className="material-symbols-rounded">area_chart</span>
          <p>Facturas: {formatInteger(metrics?.totalInvoices)}</p>
          <p>Notas crédito: {formatInteger(metrics?.totalCreditNotes)}</p>
          <p>Notas débito: {formatInteger(metrics?.totalDebitNotes)}</p>
        </div>
      </div>
      {metricsError && <p className="home-feedback">{metricsError}</p>}
    </section>
  );
};

const ClientsView = () => (
  <section className="clients-view" aria-labelledby="clients-heading">
    <div className="view-header">
      <div>
        <p className="section-kicker">Relaciones que crecen</p>
        <h2 id="clients-heading">Clientes con seguimiento inteligente</h2>
        <p>Segmenta, prioriza y deleita a tu cartera con acciones oportunas.</p>
      </div>
      <button type="button" className="primary-button">
        <span className="material-symbols-rounded">person_add</span>
        Nuevo cliente
      </button>
    </div>
    <div className="clients-table">
      <div className="clients-table-head">
        <span>Cliente</span>
        <span>Estado</span>
        <span>Última compra</span>
        <span>Valor anual</span>
      </div>
      {["Innovar S.A.", "LogiMax", "Bazar 24", "Nova Retail"].map((client, index) => (
        <div className="clients-table-row" key={client}>
          <div className="client-info">
            <div className="client-avatar">{client.charAt(0)}</div>
            <div>
              <strong>{client}</strong>
              <p>{index % 2 === 0 ? "Cliente premium" : "Cliente recurrente"}</p>
            </div>
          </div>
          <span className="status-pill status-pill--success">
            <span className="material-symbols-rounded">task_alt</span>
            Activo
          </span>
          <span>{index === 0 ? "Hace 2 días" : "Hace 1 semana"}</span>
          <span>{index === 1 ? "$24,300" : "$12,800"}</span>
        </div>
      ))}
    </div>
  </section>
);

const TransactionsView = () => (
  <section className="transactions-view" aria-labelledby="transactions-heading">
    <div className="view-header">
      <div>
        <p className="section-kicker">Pulso en vivo</p>
        <h2 id="transactions-heading">Transacciones recientes</h2>
        <p>Observa movimientos en tiempo real y mantente un paso adelante.</p>
      </div>
      <button type="button" className="ghost-button">
        <span className="material-symbols-rounded">tune</span>
        Filtrar
      </button>
    </div>
    <div className="timeline">
      {[
        {
          title: "Factura electrónica #FE-3021",
          time: "Hace 3 minutos",
          description: "Registrada para Innovar S.A.",
          icon: "bolt",
        },
        {
          title: "Inventario sincronizado",
          time: "Hace 25 minutos",
          description: "Actualizados 8 productos con bajo stock.",
          icon: "inventory",
        },
        {
          title: "Pago recibido",
          time: "Hace 1 hora",
          description: "$4,850 de Nova Retail.",
          icon: "credit_score",
        },
      ].map((item) => (
        <article className="timeline-item" key={item.title}>
          <div className="timeline-icon">
            <span className="material-symbols-rounded">{item.icon}</span>
          </div>
          <div>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <span>{item.time}</span>
          </div>
        </article>
      ))}
    </div>
  </section>
);

const ReportsView = () => (
  <section className="reports-view" aria-labelledby="reports-heading">
    <div className="view-header">
      <div>
        <p className="section-kicker">Insights listos para compartir</p>
        <h2 id="reports-heading">Reportes estratégicos</h2>
        <p>Descarga reportes automáticos o programa envíos recurrentes.</p>
      </div>
      <button type="button" className="ghost-button">
        <span className="material-symbols-rounded">schedule_send</span>
        Programar envío
      </button>
    </div>
    <div className="reports-grid">
      {[
        {
          title: "Performance Comercial",
          description: "Volumen de ventas, ticket promedio y productos estrella.",
          icon: "equalizer",
        },
        {
          title: "Salud Financiera",
          description: "Ingresos, márgenes y rotación de cartera.",
          icon: "analytics",
        },
        {
          title: "Inventario Inteligente",
          description: "Rotación, cobertura y alertas de agotamiento.",
          icon: "inventory_2",
        },
      ].map((report) => (
        <article className="report-card" key={report.title}>
          <span className="material-symbols-rounded report-icon">{report.icon}</span>
          <h3>{report.title}</h3>
          <p>{report.description}</p>
          <button type="button" className="link-button">Descargar</button>
        </article>
      ))}
    </div>
  </section>
);

const SettingsView = () => (
  <section className="settings-view" aria-labelledby="settings-heading">
    <div className="view-header">
      <div>
        <p className="section-kicker">Personaliza tu experiencia</p>
        <h2 id="settings-heading">Preferencias del sistema</h2>
        <p>Ajusta notificaciones, seguridad y parámetros comerciales.</p>
      </div>
    </div>
    <div className="settings-grid">
      <article className="settings-card">
        <div>
          <h3>Alertas inteligentes</h3>
          <p>Recibe avisos cuando tus ventas superen el objetivo diario.</p>
        </div>
        <label className="switch">
          <input type="checkbox" defaultChecked />
          <span className="slider" />
        </label>
      </article>
      <article className="settings-card">
        <div>
          <h3>Autenticación reforzada</h3>
          <p>Activa verificación en dos pasos para todo tu equipo.</p>
        </div>
        <label className="switch">
          <input type="checkbox" defaultChecked />
          <span className="slider" />
        </label>
      </article>
      <article className="settings-card">
        <div>
          <h3>Sincronización contable</h3>
          <p>Conecta BilAI con tu ERP y automatiza registros.</p>
        </div>
        <label className="switch">
          <input type="checkbox" />
          <span className="slider" />
        </label>
      </article>
    </div>
  </section>
);

const RegisterSaleMenu = ({ onBack, onElectronicInvoice, onGenericInvoice }) => (
  <section className="workflow-container" aria-labelledby="register-sale-heading">
    <header className="workflow-header">
      <button type="button" className="workflow-back" onClick={onBack}>
        <span className="material-symbols-rounded">arrow_back</span>
        Volver al inicio
      </button>
      <p className="workflow-kicker">Registrar venta</p>
      <h2 id="register-sale-heading" className="workflow-title">
        Elige el tipo de factura
      </h2>
      <p className="workflow-subtitle">
        Selecciona el formato que necesitas y completa la información en segundos.
      </p>
    </header>
    <div className="workflow-grid">
      <button type="button" className="workflow-card" onClick={onElectronicInvoice}>
        <span className="material-symbols-rounded workflow-icon">receipt_long</span>
        <div className="workflow-card-body">
          <h3>Factura Electrónica</h3>
          <p>Genera comprobantes con datos fiscales completos y cumpliendo la normativa.</p>
        </div>
        <span className="material-symbols-rounded workflow-arrow">arrow_forward</span>
      </button>
      <button type="button" className="workflow-card" onClick={onGenericInvoice}>
        <span className="material-symbols-rounded workflow-icon">description</span>
        <div className="workflow-card-body">
          <h3>Factura Genérica</h3>
          <p>Registra ventas rápidas con la información esencial del producto vendido.</p>
        </div>
        <span className="material-symbols-rounded workflow-arrow">arrow_forward</span>
      </button>
    </div>
  </section>
);

const ElectronicInvoiceForm = ({ onBack, onSubmit }) => {
  const [formData, setFormData] = useState({
    customerName: "",
    taxId: "",
    customerEmail: "",
  });
  const [errors, setErrors] = useState({});
  const [products, setProducts] = useState([createProductRow()]);
  const [productErrors, setProductErrors] = useState([{}]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setSubmitError("");
  };

  const handleProductChange = (index, field, value) => {
    setProducts((prev) =>
      prev.map((item, rowIndex) => (rowIndex === index ? { ...item, [field]: value } : item))
    );
    setProductErrors((prev) =>
      prev.map((rowError, rowIndex) =>
        rowIndex === index ? { ...rowError, [field]: "" } : rowError
      )
    );
    setSubmitError("");
  };

  const addProductRow = () => {
    setProducts((prev) => [...prev, createProductRow()]);
    setProductErrors((prev) => [...prev, {}]);
  };

  const removeProductRow = (index) => {
    if (products.length === 1) {
      return;
    }
    setProducts((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setProductErrors((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newErrors = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = "Ingresa el nombre del cliente.";
    }
    if (!formData.taxId.trim()) {
      newErrors.taxId = "Ingresa la cédula o NIT.";
    }
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = "El correo del cliente es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = "Ingresa un correo válido.";
    }
    const { errors: rowErrors, hasErrors } = validateProductRows(products, {
      requireTaxType: true,
    });
    setProductErrors(rowErrors);

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
    } else {
      setErrors({});
    }

    if (Object.keys(newErrors).length || hasErrors) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await onSubmit({
        send_to_dian: true,
        customer_name: formData.customerName.trim(),
        customer_tax_id: formData.taxId.trim(),
        customer_email: formData.customerEmail.trim(),
        items: normalizeInvoiceItems(products, { includeTaxType: true }),
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No fue posible registrar la factura.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="workflow-container" aria-labelledby="electronic-invoice-heading">
      <header className="workflow-header">
        <button type="button" className="workflow-back" onClick={onBack}>
          <span className="material-symbols-rounded">arrow_back</span>
          Volver
        </button>
        <p className="workflow-kicker">Factura electrónica</p>
        <h2 id="electronic-invoice-heading" className="workflow-title">
          Completa los datos fiscales
        </h2>
        <p className="workflow-subtitle">
          Captura la información clave para emitir una factura certificada.
        </p>
      </header>
      <form className="invoice-form" onSubmit={handleSubmit} noValidate>
        <div className="invoice-section">
          <h3 className="invoice-section-title">Datos del cliente</h3>
          <div className="invoice-grid">
            <InputField
              type="text"
              placeholder="Nombre del cliente"
              icon="person"
              value={formData.customerName}
              onChange={handleChange}
              name="customerName"
              error={errors.customerName}
              autoComplete="name"
            />
            <InputField
              type="text"
              placeholder="Cédula o NIT"
              icon="badge"
              value={formData.taxId}
              onChange={handleChange}
              name="taxId"
              error={errors.taxId}
              autoComplete="off"
            />
            <InputField
              type="email"
              placeholder="Correo del cliente"
              icon="mail"
              value={formData.customerEmail}
              onChange={handleChange}
              name="customerEmail"
              error={errors.customerEmail}
              autoComplete="email"
            />
          </div>
        </div>
        <div className="invoice-section">
          <h3 className="invoice-section-title">Productos</h3>
          <p className="invoice-section-subtitle">
            Agrega cada producto incluido en la factura y define su impuesto correspondiente.
          </p>
          <InvoiceProductsTable
            products={products}
            errors={productErrors}
            includeTaxType
            onProductChange={handleProductChange}
            onAddProduct={addProductRow}
            onRemoveProduct={removeProductRow}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="button-secondary" onClick={onBack}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar"}
          </button>
        </div>
        {submitError && <p className="home-feedback">{submitError}</p>}
      </form>
    </section>
  );
};

const GenericInvoiceForm = ({ onBack, onSubmit }) => {
  const [products, setProducts] = useState([createProductRow()]);
  const [productErrors, setProductErrors] = useState([{}]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleProductChange = (index, field, value) => {
    setProducts((prev) =>
      prev.map((item, rowIndex) => (rowIndex === index ? { ...item, [field]: value } : item))
    );
    setProductErrors((prev) =>
      prev.map((rowError, rowIndex) =>
        rowIndex === index ? { ...rowError, [field]: "" } : rowError
      )
    );
    setSubmitError("");
  };

  const addProductRow = () => {
    setProducts((prev) => [...prev, createProductRow()]);
    setProductErrors((prev) => [...prev, {}]);
  };

  const removeProductRow = (index) => {
    if (products.length === 1) {
      return;
    }
    setProducts((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    setProductErrors((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const { errors: rowErrors, hasErrors } = validateProductRows(products);
    setProductErrors(rowErrors);
    if (hasErrors) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      await onSubmit({
        send_to_dian: false,
        items: normalizeInvoiceItems(products, { includeTaxType: false }),
      });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "No fue posible registrar la factura.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="workflow-container" aria-labelledby="generic-invoice-heading">
      <header className="workflow-header">
        <button type="button" className="workflow-back" onClick={onBack}>
          <span className="material-symbols-rounded">arrow_back</span>
          Volver
        </button>
        <p className="workflow-kicker">Factura genérica</p>
        <h2 id="generic-invoice-heading" className="workflow-title">
          Registra los detalles esenciales
        </h2>
        <p className="workflow-subtitle">
          Mantén el control de tus ventas rápidas con datos claros y organizados.
        </p>
      </header>
      <form className="invoice-form" onSubmit={handleSubmit} noValidate>
        <div className="invoice-section">
          <h3 className="invoice-section-title">Productos</h3>
          <p className="invoice-section-subtitle">
            Añade cada artículo de la venta con su cantidad y precio correspondiente.
          </p>
          <InvoiceProductsTable
            products={products}
            errors={productErrors}
            includeTaxType={false}
            onProductChange={handleProductChange}
            onAddProduct={addProductRow}
            onRemoveProduct={removeProductRow}
          />
        </div>
        <div className="form-actions">
          <button type="button" className="button-secondary" onClick={onBack}>
            Cancelar
          </button>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Registrando..." : "Registrar"}
          </button>
        </div>
        {submitError && <p className="home-feedback">{submitError}</p>}
      </form>
    </section>
  );
};

const LoaderOverlay = ({ message }) => (
  <div className="loading-overlay" role="status" aria-live="polite">
    <div className="loading-spinner" />
    <p>{message}</p>
  </div>
);

const workflowViews = new Set([
  VIEWS.REGISTER_SALE_MENU,
  VIEWS.ELECTRONIC_INVOICE,
  VIEWS.GENERIC_INVOICE,
]);

const App = () => {
  const [view, setView] = useState(VIEWS.HOME);
  const [dashboardFeedback, setDashboardFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Cargando...");
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [metrics, setMetrics] = useState(() => parseMetricsPayload({}));
  const [previousMetrics, setPreviousMetrics] = useState(() => parseMetricsPayload({}));
  const [metricsPeriod, setMetricsPeriod] = useState(getCurrentMonthPeriod());
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let active = true;
    stripLegacySessionParams();
    clearStoredSession();

    const bootstrapSession = async () => {
      try {
        const payload = await requestPortalApi("/session/me");
        const sessionUser = normalizeSessionUser(payload);
        if (!sessionUser) {
          throw new Error("La sesión del tenant devolvió un formato inválido.");
        }

        if (!active) {
          return;
        }

        setPortalCsrfToken(typeof payload?.csrfToken === "string" ? payload.csrfToken : "");

        setCurrentUser(sessionUser);
        setSessionReady(true);
      } catch {
        clearStoredSession();
        if (active) {
          window.location.replace(LOGIN_APP_URL);
        }
      }
    };

    bootstrapSession();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mobileBreakpoint = window.matchMedia("(max-width: 960px)");
    const applyViewportMode = (matches) => {
      setIsMobileViewport(matches);
      setIsSidebarCollapsed(matches);
    };

    applyViewportMode(mobileBreakpoint.matches);

    const handleViewportChange = (event) => {
      applyViewportMode(event.matches);
    };

    if (typeof mobileBreakpoint.addEventListener === "function") {
      mobileBreakpoint.addEventListener("change", handleViewportChange);
      return () => mobileBreakpoint.removeEventListener("change", handleViewportChange);
    }

    mobileBreakpoint.addListener(handleViewportChange);
    return () => mobileBreakpoint.removeListener(handleViewportChange);
  }, []);

  const loadMetrics = useCallback(async () => {
    const fetchPeriodMetrics = async (period) => {
      const payload = await requestPortalApi("/metrics", {
        method: "GET",
        query: {
          year: String(period.year),
          month: String(period.month).padStart(2, "0"),
        },
      });

      if (!payload || typeof payload !== "object") {
        throw new Error("La respuesta de métricas llegó en un formato inválido.");
      }

      return {
        year: Number(payload.year) || period.year,
        month: Number(payload.month) || period.month,
        metrics: parseMetricsPayload(payload.metrics),
      };
    };

    const currentPeriod = getCurrentMonthPeriod();
    const previousPeriod = getPreviousMonthPeriod(currentPeriod);

    setMetricsLoading(true);
    setMetricsError("");
    try {
      const [currentResponse, previousResponse] = await Promise.all([
        fetchPeriodMetrics(currentPeriod),
        fetchPeriodMetrics(previousPeriod),
      ]);
      setMetrics(currentResponse.metrics);
      setPreviousMetrics(previousResponse.metrics);
      setMetricsPeriod({
        year: currentResponse.year,
        month: currentResponse.month,
      });
    } catch (error) {
      setMetricsError(error instanceof Error ? error.message : "No fue posible cargar métricas.");
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) {
      return undefined;
    }

    loadMetrics();
    if (typeof window === "undefined") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      loadMetrics();
    }, 180000);

    return () => window.clearInterval(intervalId);
  }, [sessionReady, loadMetrics]);

  const transitionTo = (nextView, { message = "Cargando...", afterTransition } = {}) => {
    setLoadingMessage(message);
    setIsLoading(true);
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo(0, 0);
    }
    setTimeout(() => {
      setView(nextView);
      if (afterTransition) {
        afterTransition();
      }
      setIsLoading(false);
    }, 650);
  };

  const handleLogout = async () => {
    try {
      await requestPortalApi("/session/logout", { method: "POST" });
    } catch {
      // If the backend session is already invalid, we still clear local remnants and redirect.
    }

    clearStoredSession();
    window.location.replace(LOGIN_APP_URL);
  };

  const handleRegisterSale = () => {
    setDashboardFeedback("");
    transitionTo(VIEWS.REGISTER_SALE_MENU, {
      message: "Cargando opciones de factura...",
    });
  };

  const handleViewSales = () => {
    setDashboardFeedback("");
    transitionTo(VIEWS.SALES, { message: "Analizando tus resultados más recientes..." });
  };

  const handleInventory = () => {
    setDashboardFeedback("");
    transitionTo(VIEWS.INVENTORY, { message: "Sincronizando niveles de inventario..." });
  };

  const goBackToHome = () => {
    transitionTo(VIEWS.HOME, { message: "Volviendo al inicio..." });
  };

  const goBackToRegisterSale = () => {
    transitionTo(VIEWS.REGISTER_SALE_MENU, {
      message: "Retomando opciones de factura...",
    });
  };

  const goToElectronicInvoice = () => {
    transitionTo(VIEWS.ELECTRONIC_INVOICE, {
      message: "Preparando el formulario electrónico...",
    });
  };

  const goToGenericInvoice = () => {
    transitionTo(VIEWS.GENERIC_INVOICE, {
      message: "Abriendo factura genérica...",
    });
  };

  const submitInvoiceAndReturn = async (payload, successMessage) => {
    const response = await requestPortalApi("/invoices", {
      method: "POST",
      body: payload,
    });

    let contextualMessage = successMessage;
    if (response && typeof response === "object") {
      const reference =
        response.invoice_number ||
        response.invoiceNumber ||
        response.document_number ||
        response.documentNumber ||
        response.number;
      if (typeof reference === "string" && reference.trim()) {
        contextualMessage = `${successMessage} Referencia: ${reference.trim()}.`;
      }
    }

    transitionTo(VIEWS.HOME, {
      message: "Guardando tu información...",
      afterTransition: () => {
        setDashboardFeedback(contextualMessage);
        loadMetrics();
      },
    });
  };

  const handleMenuSelect = (targetView) => {
    if (workflowViews.has(view) && targetView === VIEWS.HOME) {
      goBackToHome();
      if (isMobileViewport) {
        setIsSidebarCollapsed(true);
      }
      return;
    }

    if (targetView === view) {
      if (isMobileViewport) {
        setIsSidebarCollapsed(true);
      }
      return;
    }

    const messages = {
      [VIEWS.HOME]: "Cargando tu panel principal...",
      [VIEWS.SALES]: "Resumiendo tu histórico de ventas...",
      [VIEWS.INVENTORY]: "Mapeando tu inventario en segundos...",
      [VIEWS.DASHBOARDS]: "Actualizando métricas en tiempo real...",
      [VIEWS.CLIENTS]: "Cargando clientes destacados...",
      [VIEWS.TRANSACTIONS]: "Obteniendo movimientos recientes...",
      [VIEWS.REPORTS]: "Preparando tus reportes más usados...",
      [VIEWS.SETTINGS]: "Abriendo preferencias de la cuenta...",
    };

    if (targetView !== VIEWS.HOME) {
      setDashboardFeedback("");
    }

    transitionTo(targetView, { message: messages[targetView] });
    if (isMobileViewport) {
      setIsSidebarCollapsed(true);
    }
  };

  const activeNavView = workflowViews.has(view) ? VIEWS.HOME : view;
  const meta = VIEW_META[view] || VIEW_META[VIEWS.HOME];

  const renderAuthenticatedContent = () => {
    switch (view) {
      case VIEWS.HOME:
        return (
          <HomeView
            onRegisterSale={handleRegisterSale}
            onViewSales={handleViewSales}
            onInventory={handleInventory}
            feedback={dashboardFeedback}
            metrics={metrics}
            metricsPrevious={previousMetrics}
            metricsPeriod={metricsPeriod}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            onRefreshMetrics={loadMetrics}
          />
        );
      case VIEWS.SALES:
        return (
          <SalesView
            metrics={metrics}
            metricsPrevious={previousMetrics}
            metricsPeriod={metricsPeriod}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            onRefreshMetrics={loadMetrics}
          />
        );
      case VIEWS.INVENTORY:
        return <InventoryView />;
      case VIEWS.DASHBOARDS:
        return (
          <DashboardsView
            metrics={metrics}
            metricsPrevious={previousMetrics}
            metricsPeriod={metricsPeriod}
            metricsLoading={metricsLoading}
            metricsError={metricsError}
            onRefreshMetrics={loadMetrics}
          />
        );
      case VIEWS.CLIENTS:
        return <ClientsView />;
      case VIEWS.TRANSACTIONS:
        return <TransactionsView />;
      case VIEWS.REPORTS:
        return <ReportsView />;
      case VIEWS.SETTINGS:
        return <SettingsView />;
      case VIEWS.REGISTER_SALE_MENU:
        return (
          <RegisterSaleMenu
            onBack={goBackToHome}
            onElectronicInvoice={goToElectronicInvoice}
            onGenericInvoice={goToGenericInvoice}
          />
        );
      case VIEWS.ELECTRONIC_INVOICE:
        return (
          <ElectronicInvoiceForm
            onBack={goBackToRegisterSale}
            onSubmit={(payload) =>
              submitInvoiceAndReturn(payload, "Factura electrónica registrada con éxito.")
            }
          />
        );
      case VIEWS.GENERIC_INVOICE:
        return (
          <GenericInvoiceForm
            onBack={goBackToRegisterSale}
            onSubmit={(payload) =>
              submitInvoiceAndReturn(payload, "Factura genérica registrada correctamente.")
            }
          />
        );
      default:
        return null;
    }
  };

  const userInitial = getInitial(currentUser?.name, currentUser?.email);

  if (!sessionReady) {
    return <LoaderOverlay message="Validando sesión..." />;
  }

  return (
    <>
      <div
        className={`app-shell${isSidebarCollapsed ? " sidebar-collapsed" : ""}${
          isMobileViewport ? " is-mobile-viewport" : ""
        }`}
      >
        <aside className="sidebar" aria-label="Menú principal">
          <div className="sidebar-brand">
            <img src={isSidebarCollapsed ? logoicon : logo} alt="BilAI" />
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              aria-label={
                isMobileViewport
                  ? isSidebarCollapsed
                    ? "Abrir menú"
                    : "Cerrar menú"
                  : isSidebarCollapsed
                    ? "Expandir menú"
                    : "Minimizar menú"
              }
              title={
                isMobileViewport
                  ? isSidebarCollapsed
                    ? "Abrir menú"
                    : "Cerrar menú"
                  : isSidebarCollapsed
                    ? "Expandir menú"
                    : "Minimizar menú"
              }
            >
              <span className="material-symbols-rounded">
                {isMobileViewport
                  ? isSidebarCollapsed
                    ? "menu"
                    : "close"
                  : isSidebarCollapsed
                    ? "chevron_right"
                    : "chevron_left"}
              </span>
            </button>
          </div>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.view}
                type="button"
                className={`sidebar-link${activeNavView === item.view ? " is-active" : ""}`}
                onClick={() => handleMenuSelect(item.view)}
              >
                <span className="material-symbols-rounded">{item.icon}</span>
                <span className="sidebar-link-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-user">
            <div className="user-avatar" aria-hidden="true">
              {userInitial}
            </div>
            <div className="sidebar-user-copy">
              <strong>{currentUser?.name || "Usuario"}</strong>
              <p>{currentUser?.email}</p>
            </div>
          </div>
        </aside>
        {isMobileViewport && !isSidebarCollapsed && (
          <button
            type="button"
            className="sidebar-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}
        <div className="app-shell-main">
          <div className="app-shell-surface">
            <header className="app-topbar">
              <div className="app-topbar-main">
                {isMobileViewport && isSidebarCollapsed && (
                  <button
                    type="button"
                    className="mobile-menu-trigger"
                    onClick={() => setIsSidebarCollapsed(false)}
                    aria-label="Abrir menú"
                    title="Abrir menú"
                  >
                    <span className="material-symbols-rounded">menu</span>
                  </button>
                )}
                <div>
                  <h1>{meta.title}</h1>
                  <p>{meta.description}</p>
                </div>
              </div>
              <div className="app-topbar-actions">
                <button type="button" className="ghost-button" onClick={handleLogout}>
                  <span className="material-symbols-rounded">logout</span>
                  Cerrar sesión
                </button>
              </div>
            </header>
            <main className={`app-content${workflowViews.has(view) ? " app-content--narrow" : ""}`}>
              {renderAuthenticatedContent()}
            </main>
          </div>
        </div>
      </div>

      {isLoading && <LoaderOverlay message={loadingMessage} />}
    </>
  );
};

export default App;
