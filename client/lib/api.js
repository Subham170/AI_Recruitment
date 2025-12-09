// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

  getRecruiters: async () => {
    return apiRequest("/users/recruiters", {
      method: "GET",
    });
  },
};

// Job Posting API functions
export const jobPostingAPI = {
  getAllJobPostings: async (filters = {}) => {
    const params = new URLSearchParams();

    if (filters.search) params.append("search", filters.search);
    if (filters.job_type) params.append("job_type", filters.job_type);
    if (filters.role) {
      if (Array.isArray(filters.role)) {
        filters.role.forEach((r) => params.append("role", r));
      } else {
        params.append("role", filters.role);
      }
    }
    if (filters.min_exp !== undefined)
      params.append("min_exp", filters.min_exp);
    if (filters.max_exp !== undefined)
      params.append("max_exp", filters.max_exp);
    if (filters.min_ctc !== undefined)
      params.append("min_ctc", filters.min_ctc);
    if (filters.max_ctc !== undefined)
      params.append("max_ctc", filters.max_ctc);
    if (filters.company) params.append("company", filters.company);
    if (filters.skills) {
      if (Array.isArray(filters.skills)) {
        filters.skills.forEach((s) => params.append("skills", s));
      } else {
        params.append("skills", filters.skills);
      }
    }
    if (filters.date_from) params.append("date_from", filters.date_from);
    if (filters.date_to) params.append("date_to", filters.date_to);

    const endpoint = `/job-postings${
      params.toString() ? `?${params.toString()}` : ""
    }`;
    return apiRequest(endpoint, {
      method: "GET",
    });
  },

  getJobPostingById: async (id) => {
    return apiRequest(`/job-postings/${id}`, {
      method: "GET",
    });
  },

  createJobPosting: async (jobData) => {
    return apiRequest("/job-postings", {
      method: "POST",
      body: jobData,
    });
  },

  updateJobPosting: async (id, jobData) => {
    return apiRequest(`/job-postings/${id}`, {
      method: "PUT",
      body: jobData,
    });
  },
};

// Matching API functions
export const matchingAPI = {
  getJobMatches: async (jobId) => {
    return apiRequest(`/matching/job/${jobId}/candidates`, {
      method: "GET",
    });
  },

  refreshJobMatches: async (jobId) => {
    return apiRequest(`/matching/job/${jobId}/refresh`, {
      method: "POST",
    });
  },

  getCandidateMatches: async (candidateId) => {
    return apiRequest(`/matching/candidate/${candidateId}/jobs`, {
      method: "GET",
    });
  },
};

// Candidate API functions
export const candidateAPI = {
  getCandidateById: async (candidateId) => {
    return apiRequest(`/candidates/${candidateId}`, {
      method: "GET",
    });
  },

  getCandidates: async () => {
    return apiRequest("/candidates", {
      method: "GET",
    });
  },

  getCandidatesByRole: async (role) => {
    return apiRequest(`/candidates/role/${role}`, {
      method: "GET",
    });
  },

  createCandidate: async (candidateData) => {
    return apiRequest("/candidates", {
      method: "POST",
      body: candidateData,
    });
  },

  getCandidateMatchedJobs: async (candidateId) => {
    return apiRequest(`/matching/candidate/${candidateId}/jobs`, {
      method: "GET",
    });
  },
};

// Bolna API functions
export const bolnaAPI = {
  scheduleCall: async (callData) => {
    return apiRequest("/bolna/schedule-call", {
      method: "POST",
      body: callData,
    });
  },

  scheduleCallsBatch: async (batchData) => {
    return apiRequest("/bolna/schedule-calls-batch", {
      method: "POST",
      body: batchData,
    });
  },

  checkCallsScheduled: async (checkData) => {
    return apiRequest("/bolna/check-calls", {
      method: "POST",
      body: checkData,
    });
  },

  stopCall: async (executionId) => {
    return apiRequest(`/bolna/call/${executionId}/stop`, {
      method: "POST",
    });
  },

  stopAllCalls: async (jobId) => {
    return apiRequest(`/bolna/job/${jobId}/stop-all`, {
      method: "POST",
    });
  },

  getCallStatus: async (executionId) => {
    return apiRequest(`/bolna/call/${executionId}/status`, {
      method: "GET",
    });
  },

  getCallsByJob: async (jobId) => {
    return apiRequest(`/bolna/job/${jobId}/calls`, {
      method: "GET",
    });
  },
};

// Recruiter Availability API functions
export const recruiterAvailabilityAPI = {
  createOrUpdateAvailability: async (jobId, availabilitySlots) => {
    return apiRequest("/recruiter-availability", {
      method: "POST",
      body: {
        job_id: jobId,
        availability_slots: availabilitySlots,
      },
    });
  },

  getAvailabilityByJob: async (jobId) => {
    return apiRequest(`/recruiter-availability/job/${jobId}`, {
      method: "GET",
    });
  },

  getAllAvailabilityByJob: async (jobId) => {
    return apiRequest(`/recruiter-availability/job/${jobId}/all`, {
      method: "GET",
    });
  },

  getMyAvailability: async () => {
    return apiRequest("/recruiter-availability/recruiter/my-availability", {
      method: "GET",
    });
  },

  updateAvailabilitySlots: async (jobId, action, slot) => {
    return apiRequest(`/recruiter-availability/job/${jobId}/slots`, {
      method: "PATCH",
      body: {
        action,
        slot,
      },
    });
  },

  deleteAvailability: async (jobId) => {
    return apiRequest(`/recruiter-availability/job/${jobId}`, {
      method: "DELETE",
    });
  },
};

// Dashboard API functions
export const dashboardAPI = {
  getDashboardStats: async () => {
    return apiRequest("/dashboard/stats", {
      method: "GET",
    });
  },

  getUserAnalytics: async (userId) => {
    return apiRequest(`/dashboard/analytics/${userId}`, {
      method: "GET",
    });
  },
};
