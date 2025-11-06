"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // TODO: Replace with actual API call when backend is ready
      // This is a placeholder for DB credential checking
      // Example API call structure:
      // const response = await fetch('http://localhost:5000/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password })
      // });
      // const data = await response.json();
      // if (!response.ok) throw new Error(data.message);

      // Placeholder: Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Placeholder: Check credentials in DB
      // For now, this is a dummy check - replace with actual DB query
      // const user = await checkCredentialsInDB(email, password);
      // if (!user) throw new Error('Invalid credentials');

      // Temporary: For demo purposes, accept any credentials
      // Remove this when backend is ready
      const userData = {
        email,
        role: "recruiter", // This should come from DB (options: recruiter, manager, admin)
        name: email.split("@")[0], // This should come from DB
        id: Date.now().toString(), // This should come from DB
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      router.push("/dashboard");
    } catch (error) {
      throw error;
    }
  };

  const signup = (name, email, password, role) => {
    // In a real app, this would be an API call
    // For demo purposes, we'll simulate signup
    const userData = {
      email,
      role,
      name,
      id: Date.now().toString(),
    };

    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
    router.push("/dashboard");
  };

  const logout = () => {
    setUser(null);
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
