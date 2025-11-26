// API configuration
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

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

  getUsers: async (options = {}) => {
    const { filterRole = null, search = "", page = 1, pageSize = 7 } = options;
    const params = new URLSearchParams();
    
    if (filterRole) params.append("role", filterRole);
    if (search) params.append("search", search);
    params.append("page", page.toString());
    params.append("pageSize", pageSize.toString());
    
    const endpoint = `/users?${params.toString()}`;
    return apiRequest(endpoint, {
      method: "GET",
    });
  },

  updateUser: async (userId, userData) => {
    return apiRequest(`/users/${userId}`, {
      method: "PUT",
      body: userData,
    });
  },

  deleteUser: async (userId) => {
    return apiRequest(`/users/${userId}`, {
      method: "DELETE",
    });
  },
};
