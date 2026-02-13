import { useEffect, useMemo, useRef, useState } from "react";
import SocialLogin from "./components/SocialLogin";
import InputField from "./components/InputField";
import {
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from "./api/auth";
import logo from "/bilailogocompleto.png";
import logoicon from "/bilailogo.svg";

const LOGIN_APP_URL = import.meta.env.VITE_LOGIN_APP_URL || "http://localhost:5173";

const VIEWS = {
  LOGIN: "login",
  REGISTER: "register",
  FORGOT_PASSWORD: "forgot-password",
  RESET_PASSWORD: "reset-password",
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

const initialLoginState = { email: "", password: "" };
const initialRegisterState = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const CODE_LENGTH = 6;

const passwordValidators = [
  {
    test: (value) => value.length >= 8,
    message: "Debe tener al menos 8 caracteres.",
  },
  {
    test: (value) => /[A-Z]/.test(value),
    message: "Debe incluir una letra mayúscula.",
  },
  {
    test: (value) => /[a-z]/.test(value),
    message: "Debe incluir una letra minúscula.",
  },
  {
    test: (value) => /\d/.test(value),
    message: "Debe incluir un número.",
  },
  {
    test: (value) => /[^A-Za-z0-9]/.test(value),
    message: "Debe incluir un caracter especial.",
  },
];

const validatePassword = (password) =>
  passwordValidators.filter(({ test }) => !test(password)).map(({ message }) => message);

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
              <td>
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
              <td>
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
              <td>
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
                <td>
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
              <td className="table-actions">
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

const OneTimeCodeInput = ({ value, onChange, error }) => {
  const safeValue = (value ?? "").replace(/\D/g, "").slice(0, CODE_LENGTH);
  const inputsRef = useRef([]);

  useEffect(() => {
    const nextIndex = safeValue.length;
    if (nextIndex < CODE_LENGTH && inputsRef.current[nextIndex]) {
      inputsRef.current[nextIndex].focus();
    }
  }, [safeValue]);

  const digitsFromValue = () => {
    const base = Array.from({ length: CODE_LENGTH }, (_, index) => safeValue[index] ?? "");
    return base;
  };

  const commitDigits = (digits) => {
    const nextValue = digits.join("").replace(/\D/g, "").slice(0, CODE_LENGTH);
    onChange(nextValue);
  };

  const handleChange = (event, index) => {
    const inputValue = event.target.value.replace(/\D/g, "");
    const digits = digitsFromValue();

    if (!inputValue) {
      digits[index] = "";
      commitDigits(digits);
      return;
    }

    inputValue.split("").forEach((digit, offset) => {
      const targetIndex = index + offset;
      if (targetIndex < CODE_LENGTH) {
        digits[targetIndex] = digit;
      }
    });

    commitDigits(digits);

    const nextIndex = Math.min(index + inputValue.length, CODE_LENGTH - 1);
    const nextInput = inputsRef.current[nextIndex];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const digits = digitsFromValue();
      if (digits[index]) {
        digits[index] = "";
        commitDigits(digits);
        return;
      }
      if (index > 0) {
        digits[index - 1] = "";
        commitDigits(digits);
        inputsRef.current[index - 1]?.focus();
      }
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      inputsRef.current[prevIndex]?.focus();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = Math.min(index + 1, CODE_LENGTH - 1);
      inputsRef.current[nextIndex]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const clipboardData = event.clipboardData.getData("text");
    const sanitized = clipboardData.replace(/\D/g, "").slice(0, CODE_LENGTH);
    const digits = digitsFromValue();
    sanitized.split("").forEach((digit, index) => {
      if (index < CODE_LENGTH) {
        digits[index] = digit;
      }
    });
    commitDigits(digits);
    if (sanitized.length) {
      const nextIndex = Math.min(sanitized.length, CODE_LENGTH) - 1;
      inputsRef.current[nextIndex]?.focus();
    }
  };

  const digits = digitsFromValue();

  return (
    <div className={`otp-input-group${error ? " has-error" : ""}`}>
      <div className="otp-input-row">
        {digits.map((digit, index) => (
          <input
            key={index}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit.trim()}
            onChange={(event) => handleChange(event, index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onPaste={handlePaste}
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            className="otp-input"
            aria-label={`Dígito ${index + 1} del código`}
          />
        ))}
      </div>
      {error && <p className="input-error">{error}</p>}
    </div>
  );
};

const LoginForm = ({ onRegisterLinkClick, onForgotPassword, onSuccess }) => {
  const [formData, setFormData] = useState(initialLoginState);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    try {
      const email = formData.email.trim();
      const response = await login(email, formData.password);
      onSuccess({
        token: response.token,
        email,
        firstName: response.first_name,
        lastName: response.last_name,
      });
      setFormData(initialLoginState);
    } catch (err) {
      setError(err.message || "No se pudo iniciar sesión");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <InputField
        type="email"
        placeholder="Correo electrónico"
        icon="mail"
        value={formData.email}
        onChange={handleChange}
        autoComplete="email"
        name="email"
      />
      <InputField
        type="password"
        placeholder="Contraseña"
        icon="lock"
        value={formData.password}
        onChange={handleChange}
        autoComplete="current-password"
        name="password"
      />
      <button
        type="button"
        className="forgot-password-link"
        onClick={onForgotPassword}
      >
        ¿Olvidaste tu contraseña?
      </button>
      <button type="submit" className="login-button">
        Ingresar
      </button>
      <p className="signup-prompt">
        ¿No tienes una cuenta?{" "}
        <button type="button" onClick={onRegisterLinkClick} className="link-button">
          Regístrate
        </button>
      </p>
      {error && <p className="form-feedback">{error}</p>}
    </form>
  );
};

const RegisterForm = ({ onLoginLinkClick }) => {
  const [formData, setFormData] = useState(initialRegisterState);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState("");

  const passwordErrorMessages = useMemo(
    () => validatePassword(formData.password),
    [formData.password]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setFeedback("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newErrors = {};
    setFeedback("");

    const email = formData.email.trim();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName) {
      newErrors.firstName = "Ingresa tus nombres.";
    }

    if (!lastName) {
      newErrors.lastName = "Ingresa tus apellidos.";
    }

    if (!email) {
      newErrors.email = "El correo es obligatorio.";
    } else if (!emailPattern.test(email)) {
      newErrors.email = "Ingresa un correo electrónico válido.";
    }

    if (passwordErrorMessages.length) {
      newErrors.password = passwordErrorMessages.join(" ");
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    try {
      await register({
        email,
        password: formData.password,
        firstName,
        lastName,
      });
      onLoginLinkClick("Cuenta creada. Inicia sesión para continuar.");
      setFormData(initialRegisterState);
    } catch (error) {
      setFeedback(error.message || "No pudimos crear tu cuenta.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <InputField
        type="text"
        placeholder="Nombres"
        icon="badge"
        value={formData.firstName}
        onChange={handleChange}
        autoComplete="given-name"
        error={errors.firstName}
        name="firstName"
      />
      <InputField
        type="text"
        placeholder="Apellidos"
        icon="badge"
        value={formData.lastName}
        onChange={handleChange}
        autoComplete="family-name"
        error={errors.lastName}
        name="lastName"
      />
      <InputField
        type="email"
        placeholder="Correo electrónico"
        icon="mail"
        value={formData.email}
        onChange={handleChange}
        autoComplete="email"
        error={errors.email}
        name="email"
      />
      <InputField
        type="password"
        placeholder="Contraseña"
        icon="lock"
        value={formData.password}
        onChange={handleChange}
        autoComplete="new-password"
        error={errors.password}
        name="password"
      />
      <InputField
        type="password"
        placeholder="Confirma tu contraseña"
        icon="lock"
        value={formData.confirmPassword}
        onChange={handleChange}
        autoComplete="new-password"
        error={errors.confirmPassword}
        name="confirmPassword"
      />
      <button type="submit" className="register-button">
        Registrarse
      </button>
      <p className="login-prompt">
        ¿Ya tienes cuenta?{" "}
        <button type="button" onClick={() => onLoginLinkClick("")} className="link-button">
          Inicia sesión
        </button>
      </p>
      {feedback && <p className="form-feedback">{feedback}</p>}
    </form>
  );
};

const ForgotPasswordForm = ({ onBack, onSuccess, initialEmail = "" }) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setFeedback("");

    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      setError("Ingresa tu correo electrónico.");
      return;
    }

    if (!emailPattern.test(trimmedEmail)) {
      setError("Introduce un correo válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await requestPasswordReset(trimmedEmail);
      setFeedback(
        response?.message ||
          "Te enviamos un código de verificación de seis dígitos a tu correo."
      );
      onSuccess({ email: trimmedEmail });
    } catch (err) {
      const message = err.message || "No pudimos iniciar el proceso de recuperación.";
      setError(message);
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <p className="form-intro">
        Ingresa el correo asociado a tu cuenta y te ayudaremos a restablecer tu contraseña.
      </p>
      <InputField
        type="email"
        placeholder="Correo electrónico"
        icon="mail"
        value={email}
        onChange={(event) => {
          setEmail(event.target.value);
          setError("");
          setFeedback("");
        }}
        autoComplete="email"
        error={error}
        name="resetEmail"
      />
      <button type="submit" className="register-button" disabled={isSubmitting}>
        {isSubmitting ? "Enviando instrucciones..." : "Enviar instrucciones"}
      </button>
      <p className="login-prompt">
        ¿Recordaste tu contraseña?{" "}
        <button type="button" onClick={onBack} className="link-button">
          Volver al inicio de sesión
        </button>
      </p>
      {feedback && <p className="form-feedback">{feedback}</p>}
    </form>
  );
};

const ResetPasswordForm = ({ onBack, onComplete, email }) => {
  const [formData, setFormData] = useState({
    code: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordErrorMessages = useMemo(
    () => validatePassword(formData.newPassword),
    [formData.newPassword]
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setFeedback("");
  };

  const handleCodeChange = (nextValue) => {
    setFormData((prev) => ({ ...prev, code: nextValue }));
    setErrors((prev) => ({ ...prev, code: "" }));
    setFeedback("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const newErrors = {};

    if (formData.code.trim().length !== CODE_LENGTH) {
      newErrors.code = "Ingresa el código completo.";
    }

    if (passwordErrorMessages.length) {
      newErrors.newPassword = passwordErrorMessages.join(" ");
    }

    if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(formData.code.trim(), formData.newPassword);
      onComplete();
    } catch (err) {
      setFeedback(err.message || "No pudimos actualizar tu contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <p className="form-intro">
        Introduce el código de verificación y define tu nueva contraseña
        {email ? (
          <>
            {" "}
            para <strong>{email}</strong>
          </>
        ) : null}
        .
      </p>
      <div className="otp-field-wrapper">
        <span className="material-symbols-rounded" aria-hidden="true">
          key
        </span>
        <OneTimeCodeInput value={formData.code} onChange={handleCodeChange} error={errors.code} />
      </div>
      <InputField
        type="password"
        placeholder="Nueva contraseña"
        icon="lock"
        value={formData.newPassword}
        onChange={handleChange}
        autoComplete="new-password"
        error={errors.newPassword}
        name="newPassword"
      />
      <InputField
        type="password"
        placeholder="Confirma tu contraseña"
        icon="lock"
        value={formData.confirmPassword}
        onChange={handleChange}
        autoComplete="new-password"
        error={errors.confirmPassword}
        name="confirmPassword"
      />
      <button type="submit" className="register-button" disabled={isSubmitting}>
        {isSubmitting ? "Actualizando..." : "Actualizar contraseña"}
      </button>
      <p className="login-prompt">
        ¿Necesitas otro token?{" "}
        <button type="button" onClick={onBack} className="link-button">
          Volver a solicitarlo
        </button>
      </p>
      {feedback && <p className="form-feedback">{feedback}</p>}
    </form>
  );
};

const HomeView = ({ onRegisterSale, onViewSales, onInventory, feedback }) => (
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
        <p>Resumen de hoy</p>
        <h3>$18,250</h3>
        <span>+12% vs ayer</span>
        <div className="trend-chip">
          <span className="material-symbols-rounded">trending_up</span>
          Crecimiento saludable
        </div>
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
  </section>
);

const SalesView = () => {
  const sales = [
    {
      id: "FE-3482",
      client: "Innovar S.A.",
      channel: "Factura electrónica",
      total: "$4,850",
      status: "Pagada",
      statusClass: "status-pill--success",
    },
    {
      id: "FG-1294",
      client: "Retail Nova",
      channel: "Factura genérica",
      total: "$1,920",
      status: "Pendiente",
      statusClass: "status-pill--warning",
    },
    {
      id: "FE-3478",
      client: "Bazar 24",
      channel: "Factura electrónica",
      total: "$3,410",
      status: "Pagada",
      statusClass: "status-pill--success",
    },
    {
      id: "FG-1289",
      client: "LogiMax",
      channel: "Factura genérica",
      total: "$760",
      status: "Revisar",
      statusClass: "status-pill--info",
    },
  ];

  return (
    <section className="sales-view" aria-labelledby="sales-heading">
      <div className="view-header">
        <div>
          <p className="section-kicker">Rendimiento comercial</p>
          <h2 id="sales-heading">Ventas con contexto de negocio</h2>
          <p>Analiza resultados diarios, ticket promedio y estado de tus ventas recientes.</p>
        </div>
        <div className="view-header-actions">
          <button type="button" className="ghost-button">
            <span className="material-symbols-rounded">calendar_today</span>
            Últimos 30 días
          </button>
          <button type="button" className="primary-button">
            <span className="material-symbols-rounded">file_download</span>
            Exportar
          </button>
        </div>
      </div>

      <div className="performance-grid">
        <article className="performance-card">
          <p>Ventas del día</p>
          <h3>$18,250</h3>
          <span className="status-pill status-pill--success">+12% vs ayer</span>
        </article>
        <article className="performance-card">
          <p>Ticket promedio</p>
          <h3>$312</h3>
          <span className="status-pill status-pill--info">+4.6% semanal</span>
        </article>
        <article className="performance-card">
          <p>Ventas facturadas</p>
          <h3>94</h3>
          <span className="status-pill status-pill--warning">8 en seguimiento</span>
        </article>
      </div>

      <div className="panel-table">
        <div className="panel-table-head">
          <span>Factura</span>
          <span>Cliente</span>
          <span>Canal</span>
          <span>Total</span>
          <span>Estado</span>
        </div>
        {sales.map((sale) => (
          <div className="panel-table-row" key={sale.id}>
            <span className="panel-strong">{sale.id}</span>
            <span>{sale.client}</span>
            <span>{sale.channel}</span>
            <span className="panel-strong">{sale.total}</span>
            <span className={`status-pill ${sale.statusClass}`}>{sale.status}</span>
          </div>
        ))}
      </div>
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

      <div className="panel-table">
        <div className="panel-table-head panel-table-head--inventory">
          <span>Producto</span>
          <span>SKU</span>
          <span>Stock</span>
          <span>Rotación</span>
          <span>Estado</span>
        </div>
        {products.map((item) => (
          <div className="panel-table-row panel-table-row--inventory" key={item.sku}>
            <div className="panel-product">
              <span className="panel-product-avatar" aria-hidden="true">
                {item.name.charAt(0)}
              </span>
              <div>
                <strong>{item.name}</strong>
                <p>Última entrada: hace 2 días</p>
              </div>
            </div>
            <span>{item.sku}</span>
            <span className="panel-strong">{item.stock}</span>
            <span>{item.rotation}</span>
            <span className={`status-pill ${item.statusClass}`}>{item.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

const DashboardsView = () => (
  <section className="dashboards-view" aria-labelledby="dashboards-heading">
    <div className="view-header">
      <div>
        <p className="section-kicker">Visión ejecutiva</p>
        <h2 id="dashboards-heading">Métricas que cuentan la historia completa</h2>
        <p>Monitorea tus ingresos, márgenes y conversiones en un solo lugar.</p>
      </div>
      <button type="button" className="ghost-button">
        <span className="material-symbols-rounded">download</span>
        Exportar reporte
      </button>
    </div>
    <div className="metrics-grid">
      <article className="metric-card">
        <span className="metric-label">Ingresos del mes</span>
        <h3>$126,450</h3>
        <p>+18% vs. mes anterior</p>
      </article>
      <article className="metric-card">
        <span className="metric-label">Margen bruto</span>
        <h3>42%</h3>
        <p>Optimizado gracias a tus renegociaciones</p>
      </article>
      <article className="metric-card">
        <span className="metric-label">Clientes activos</span>
        <h3>318</h3>
        <p>+26 nuevos esta semana</p>
      </article>
    </div>
    <div className="chart-card">
      <div className="chart-header">
        <h3>Proyección semanal</h3>
        <span className="chart-chip">Actualizado hace 5 min</span>
      </div>
      <div className="chart-placeholder">
        <span className="material-symbols-rounded">area_chart</span>
      </div>
    </div>
  </section>
);

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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
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

  const handleSubmit = (event) => {
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
    setTimeout(() => {
      onSubmit();
      setIsSubmitting(false);
    }, 550);
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
      </form>
    </section>
  );
};

const GenericInvoiceForm = ({ onBack, onSubmit }) => {
  const [products, setProducts] = useState([createProductRow()]);
  const [productErrors, setProductErrors] = useState([{}]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProductChange = (index, field, value) => {
    setProducts((prev) =>
      prev.map((item, rowIndex) => (rowIndex === index ? { ...item, [field]: value } : item))
    );
    setProductErrors((prev) =>
      prev.map((rowError, rowIndex) =>
        rowIndex === index ? { ...rowError, [field]: "" } : rowError
      )
    );
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

  const handleSubmit = (event) => {
    event.preventDefault();
    const { errors: rowErrors, hasErrors } = validateProductRows(products);
    setProductErrors(rowErrors);
    if (hasErrors) {
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      onSubmit();
      setIsSubmitting(false);
    }, 550);
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

const getSessionFromUrl = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  if (!token) {
    return null;
  }

  const email = searchParams.get("email") || "";
  const firstName = searchParams.get("firstName") || "";
  const lastName = searchParams.get("lastName") || "";
  const name = formatUserName(firstName, lastName, email);

  localStorage.setItem("token", token);
  localStorage.setItem("user_email", email);
  localStorage.setItem("user_first_name", firstName);
  localStorage.setItem("user_last_name", lastName);
  localStorage.setItem("user_name", name);

  searchParams.delete("token");
  searchParams.delete("email");
  searchParams.delete("firstName");
  searchParams.delete("lastName");
  const cleanQuery = searchParams.toString();
  const cleanUrl = `${window.location.pathname}${cleanQuery ? `?${cleanQuery}` : ""}${window.location.hash}`;
  window.history.replaceState({}, document.title, cleanUrl);

  return { email, firstName, lastName, name };
};

const App = () => {
  const [view, setView] = useState(VIEWS.HOME);
  const [loginMessage, setLoginMessage] = useState("");
  const [dashboardFeedback, setDashboardFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Cargando...");
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [passwordResetContext, setPasswordResetContext] = useState({
    email: "",
  });

  useEffect(() => {
    const sessionFromUrl = getSessionFromUrl();
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.replace(LOGIN_APP_URL);
      return;
    }

    if (sessionFromUrl) {
      setCurrentUser(sessionFromUrl);
      setSessionReady(true);
      return;
    }

    const email = localStorage.getItem("user_email") || "";
    const firstName = localStorage.getItem("user_first_name") || "";
    const lastName = localStorage.getItem("user_last_name") || "";
    const storedName = localStorage.getItem("user_name");
    const name = storedName || formatUserName(firstName, lastName, email);
    setCurrentUser({ email, firstName, lastName, name });
    setSessionReady(true);
  }, []);

  const goToLogin = (message = "") => {
    setView(VIEWS.LOGIN);
    setLoginMessage(typeof message === "string" ? message : "");
    setCurrentUser(null);
    setPasswordResetContext({ email: "" });
  };

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

  const handleForgotPasswordNavigation = () => {
    setPasswordResetContext((prev) => ({ email: prev.email }));
    transitionTo(VIEWS.FORGOT_PASSWORD, {
      message: "Preparando recuperación de acceso...",
    });
  };

  const handleForgotPasswordSuccess = ({ email }) => {
    setPasswordResetContext({ email });
    transitionTo(VIEWS.RESET_PASSWORD, {
      message: "Verificando tu identidad...",
    });
  };

  const handleResetBack = () => {
    transitionTo(VIEWS.FORGOT_PASSWORD, {
      message: "Volviendo a solicitar ayuda...",
      afterTransition: () => {
        setPasswordResetContext((prev) => ({ email: prev.email }));
      },
    });
  };

  const handlePasswordResetComplete = () => {
    const { email } = passwordResetContext;
    transitionTo(VIEWS.LOGIN, {
      message: "Actualizando tus credenciales...",
      afterTransition: () => {
        setPasswordResetContext({ email: "" });
        setLoginMessage(
          email
            ? `Listo. Actualizamos la contraseña para ${email}. Inicia sesión con tu nueva clave.`
            : "Tu contraseña se actualizó. Inicia sesión con tu nueva contraseña."
        );
      },
    });
  };

  const handleLoginSuccess = ({ token, email, firstName, lastName }) => {
    localStorage.setItem("token", token);
    const name = formatUserName(firstName, lastName, email);
    setCurrentUser({ email, name, firstName, lastName });
    setLoginMessage("");
    setDashboardFeedback("");
    transitionTo(VIEWS.HOME, { message: "Preparando tu panel personalizado..." });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_first_name");
    localStorage.removeItem("user_last_name");
    localStorage.removeItem("user_name");
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

  const submitInvoiceAndReturn = (successMessage) => {
    transitionTo(VIEWS.HOME, {
      message: "Guardando tu información...",
      afterTransition: () => {
        setDashboardFeedback(successMessage);
      },
    });
  };

  const handleMenuSelect = (targetView) => {
    if (workflowViews.has(view) && targetView === VIEWS.HOME) {
      goBackToHome();
      return;
    }

    if (targetView === view) {
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
  };

  const isAuthenticated =
    view !== VIEWS.LOGIN &&
    view !== VIEWS.REGISTER &&
    view !== VIEWS.FORGOT_PASSWORD &&
    view !== VIEWS.RESET_PASSWORD;
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
          />
        );
      case VIEWS.SALES:
        return <SalesView />;
      case VIEWS.INVENTORY:
        return <InventoryView />;
      case VIEWS.DASHBOARDS:
        return <DashboardsView />;
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
            onSubmit={() => submitInvoiceAndReturn("Factura electrónica registrada con éxito.")}
          />
        );
      case VIEWS.GENERIC_INVOICE:
        return (
          <GenericInvoiceForm
            onBack={goBackToRegisterSale}
            onSubmit={() => submitInvoiceAndReturn("Factura genérica registrada correctamente.")}
          />
        );
      default:
        return null;
    }
  };

  const renderUnauthenticated = () => {
    const titles = {
      [VIEWS.LOGIN]: "Iniciar sesión",
      [VIEWS.REGISTER]: "Crea tu cuenta",
      [VIEWS.FORGOT_PASSWORD]: "Recupera tu contraseña",
      [VIEWS.RESET_PASSWORD]: "Restablece tu contraseña",
    };

    return (
      <>
        <div className="login-container">
          <h2 className="form-title">{titles[view] || "Bienvenido"}</h2>
          {view === VIEWS.LOGIN && (
            <>
              <SocialLogin />
              <p className="separator">
                <span>o</span>
              </p>
              {loginMessage && <p className="form-feedback success">{loginMessage}</p>}
              <LoginForm
                onRegisterLinkClick={() => {
                  setView(VIEWS.REGISTER);
                  setLoginMessage("");
                }}
                onForgotPassword={handleForgotPasswordNavigation}
                onSuccess={handleLoginSuccess}
              />
            </>
          )}
          {view === VIEWS.REGISTER && <RegisterForm onLoginLinkClick={goToLogin} />}
          {view === VIEWS.FORGOT_PASSWORD && (
            <ForgotPasswordForm
              onBack={() => goToLogin()}
              onSuccess={handleForgotPasswordSuccess}
              initialEmail={passwordResetContext.email}
            />
          )}
          {view === VIEWS.RESET_PASSWORD && (
            <ResetPasswordForm
              onBack={handleResetBack}
              onComplete={handlePasswordResetComplete}
              email={passwordResetContext.email}
            />
          )}
        </div>
        <footer className="disclaimer-wrapper" aria-label="Aviso legal">
          <p className="disclaimer">
            Al ingresar aceptas nuestros
            <a href="/terms" className="disclaimer-link">
              {" "}
              Términos de Servicio
            </a>
            {" "}
            y confirmas que has leído la
            <a href="/privacy" className="disclaimer-link">
              {" "}
              Política de Privacidad
            </a>
            . <span className="disclaimer-company">BilAI © 2025</span>
          </p>
        </footer>
      </>
    );
  };

  const userInitial = getInitial(currentUser?.name, currentUser?.email);

  if (!sessionReady) {
    return <LoaderOverlay message="Validando sesión..." />;
  }

  return (
    <>
      {!isAuthenticated && (
        <>
          <header className="top-header">
            <a href="/" className="header-brand">
              <img src={logo} alt="BilAI" className="header-logo" />
            </a>
          </header>
          <main className="page-wrapper">{renderUnauthenticated()}</main>
        </>
      )}

      {isAuthenticated && (
        <div className={`app-shell${isSidebarCollapsed ? " sidebar-collapsed" : ""}`}>
          <aside className="sidebar" aria-label="Menú principal">
            <div className="sidebar-brand">
              <img src={isSidebarCollapsed ? logoicon : logo} alt="BilAI" />
              <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                aria-label={isSidebarCollapsed ? "Expandir menú" : "Minimizar menú"}
                title={isSidebarCollapsed ? "Expandir menú" : "Minimizar menú"}
              >
                <span className="material-symbols-rounded">
                  {isSidebarCollapsed ? "chevron_right" : "chevron_left"}
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
          <div className="app-shell-main">
            <div className="app-shell-surface">
              <header className="app-topbar">
                <div>
                  <h1>{meta.title}</h1>
                  <p>{meta.description}</p>
                </div>
                <button type="button" className="ghost-button" onClick={handleLogout}>
                  <span className="material-symbols-rounded">logout</span>
                  Cerrar sesión
                </button>
              </header>
              <main
                className={`app-content${workflowViews.has(view) ? " app-content--narrow" : ""}`}
              >
                {renderAuthenticatedContent()}
              </main>
            </div>
          </div>
        </div>
      )}

      {isLoading && <LoaderOverlay message={loadingMessage} />}
    </>
  );
};

export default App;
