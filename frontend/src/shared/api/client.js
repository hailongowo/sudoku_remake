const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest(path, { token, method = "GET", body, signal } = {}) {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (body !== undefined) headers.set("Content-Type", "application/json");

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError("Cannot reach the Sudoku backend.", 0);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof data?.detail === "string" ? data.detail : "Something went wrong. Please try again.";
    throw new ApiError(message, response.status, data);
  }
  return data;
}
