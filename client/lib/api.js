// API configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Helper function to make API requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  if (options.body && typeof options.body === "object") {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "An error occurred");
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Auth API functions (using /api/users endpoints)
export const authAPI = {
  login: async (email, password) => {
    return apiRequest("/users/login", {
      method: "POST",
      body: { email, password },
    });
  },
};

// User API functions
export const userAPI = {
  getCurrentUser: async () => {
    return apiRequest("/users/me", {
      method: "GET",
    });
  },

  createUser: async (userData) => {
    return apiRequest("/users", {
      method: "POST",
      body: userData,
    });
  },

  getUsers: async (filterRole = null) => {
    const endpoint = filterRole ? `/users?role=${filterRole}` : "/users";
    return apiRequest(endpoint, {
      method: "GET",
    });
  },
};
