const API_BASE_URL = "http://127.0.0.1:8000/api";

function getHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("qs_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

export async function request(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const mergedOptions = {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options.headers || {}),
    },
  };

  const response = await fetch(url, mergedOptions);

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("qs_token");
      localStorage.removeItem("qs_user");
      // Redirect to login if user session is expired
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth/login?expired=true";
      }
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Authentication
  register: (data: any) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  verifyEmail: (data: any) => request("/auth/verify-email", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  forgotPassword: (data: any) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(data) }),
  resetPassword: (data: any) => request("/auth/reset-password", { method: "POST", body: JSON.stringify(data) }),
  getMe: () => request("/auth/me"),
  updateProfile: (data: any) => request("/auth/profile", { method: "PUT", body: JSON.stringify(data) }),
  updatePrivacy: (data: any) => request("/auth/privacy", { method: "PUT", body: JSON.stringify(data) }),

  // Stocks / Prediction
  searchStocks: (query: string) => request(`/stocks/search?query=${encodeURIComponent(query)}`),
  getStockDetails: (symbol: string) => request(`/stocks/details?symbol=${encodeURIComponent(symbol)}`),
  getMacroDashboard: () => request("/stocks/macro-dashboard"),
  
  // Watchlist
  getWatchlist: () => request("/watchlist"),
  addToWatchlist: (symbol: string) => request("/watchlist/add", { method: "POST", body: JSON.stringify({ symbol }) }),
  removeFromWatchlist: (symbol: string) => request(`/watchlist/remove/${encodeURIComponent(symbol)}`, { method: "DELETE" }),

  // Optimizer & Backtester
  optimizePortfolio: (data: any) => request("/portfolio/optimize", { method: "POST", body: JSON.stringify(data) }),
  runBacktest: (data: any) => request("/backtest/run", { method: "POST", body: JSON.stringify(data) }),

  // Chatbot
  sendChatMessage: (message: string) => request("/chatbot/message", { method: "POST", body: JSON.stringify({ message }) }),

  // Alerts
  getAlerts: () => request("/alerts"),
  createAlert: (data: any) => request("/alerts/create", { method: "POST", body: JSON.stringify(data) }),
  deleteAlert: (id: number) => request(`/alerts/remove/${id}`, { method: "DELETE" }),
};
