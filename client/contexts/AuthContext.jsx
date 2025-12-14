"use client";

import { authAPI, userAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

        if (token && storedUser) {
          // Verify token is still valid by fetching user profile
          try {
            const userData = await userAPI.getCurrentUser();
            setUser(userData);
          } catch (error) {
            // Token is invalid, clear storage
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      // Call the backend login API
      const response = await authAPI.login(email, password);

      // Store token and user data
      localStorage.setItem("token", response.token);
      localStorage.setItem("user", JSON.stringify(response.user));

      // Update state
      setUser(response.user);

      // Redirect to role-specific dashboard
      if (response.user && response.user.role) {
        router.push(`/dashboard/${response.user.role}`);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      throw error;
    }
  };

  const signup = async (name, email, password, role) => {
    try {
      // Note: Signup is handled by admin creating users via /api/users
      // This function is kept for compatibility but should redirect to contact admin
      throw new Error("Please contact administrator to create an account");
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
