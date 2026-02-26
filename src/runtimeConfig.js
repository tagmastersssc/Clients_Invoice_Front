const readRuntimeConfig = () => {
  if (typeof window === "undefined") {
    return {};
  }
  const config = window.__BILAI_RUNTIME_CONFIG__;
  if (!config || typeof config !== "object") {
    return {};
  }
  return config;
};

const normalize = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim();
};

export const getRuntimeEnv = (key, fallback = "") => {
  const runtimeValue = normalize(readRuntimeConfig()[key]);
  if (runtimeValue) {
    return runtimeValue;
  }

  const viteValue = normalize(import.meta.env?.[key]);
  if (viteValue) {
    return viteValue;
  }

  return fallback;
};

