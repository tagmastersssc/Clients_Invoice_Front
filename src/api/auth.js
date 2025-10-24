const API_URL = "http://localhost:8000";

async function handleResponse(response) {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data?.detail || data?.message || "Ocurrió un error inesperado";
    throw new Error(message);
  }
  return response.json();
}

export async function login(email, password) {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(response);
}

export async function register({ email, password, firstName, lastName }) {
  const response = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      first_name: firstName,
      last_name: lastName,
    }),
  });
  return handleResponse(response);
}

export async function requestPasswordReset(email) {
  const response = await fetch(`${API_URL}/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse(response);
}

export async function resetPassword(code, newPassword) {
  const response = await fetch(`${API_URL}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, new_password: newPassword }),
  });
  return handleResponse(response);
}