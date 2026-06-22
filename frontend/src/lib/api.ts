const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || data.error || "Something went wrong");
  }

  return data;
}

export async function apiUpload(endpoint: string, formData: FormData) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Upload failed");
  return data;
}

export const authAPI = {
  register: (email: string, password: string, role: string = "USER") =>
    apiFetch("/auth/register", { method: "POST", body: JSON.stringify({ email, password, role }) }),
  login: (email: string, password: string) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
};

export const serviceAPI = {
  getAll: (category?: string, sportId?: string) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (sportId) params.set("sportId", sportId);
    return apiFetch(`/services?${params.toString()}`);
  },
  getById: (id: string) => apiFetch(`/services/${id}`),
  getMyServices: () => apiFetch("/services/me"),
  delete: (id: string) => apiFetch(`/services/${id}`, { method: "DELETE" }),
  create: (title: string, description: string, price: number, imageUrl?: string, category?: string, sportId?: string) =>
    apiFetch("/services", { method: "POST", body: JSON.stringify({ title, description, price, imageUrl, category, sportId }) }),
};

export const orderAPI = {
  create: (serviceId: string) =>
    apiFetch("/orders", { method: "POST", body: JSON.stringify({ serviceId }) }),
  getMyOrders: () => apiFetch("/orders"),
  getExpertOrders: () => apiFetch("/orders/expert"),
};

export const aiAPI = {
  generatePlan: (params: {
    age: number; weight: number; height: number; goal: string;
    workoutPlace?: string; gender: string; activityLevel: string;
    fitnessLevel: string; days: number; dietaryPreference?: string;
    budget?: string;
  }) => apiFetch("/ai/plan", { method: "POST", body: JSON.stringify(params) }),
  getPlans: () => apiFetch("/ai/plans"),
  getPlan: (id: string) => apiFetch(`/ai/plans/${id}`),
  savePlan: (data: Record<string, unknown>) =>
    apiFetch("/ai/plans", { method: "POST", body: JSON.stringify(data) }),
  updatePlan: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/ai/plans/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePlan: (id: string) =>
    apiFetch(`/ai/plans/${id}`, { method: "DELETE" }),
  getConfig: () => apiFetch("/ai/config"),
};

export const profileAPI = {
  getMyProfile: () => apiFetch("/profile/me"),
  updateProfile: (data: Record<string, unknown>) =>
    apiFetch("/profile/me", { method: "PUT", body: JSON.stringify(data) }),
  getExpertProfile: (userId: string) => apiFetch(`/profile/${userId}`),
};

export const messageAPI = {
  getConversations: () => apiFetch("/messages/conversations"),
  getMessages: (partnerId: string) => apiFetch(`/messages/${partnerId}`),
  sendMessage: (receiverId: string, content: string, imageUrl?: string) =>
    apiFetch("/messages", { method: "POST", body: JSON.stringify({ receiverId, content, imageUrl }) }),
};

export const reviewAPI = {
  getOrderReview: (orderId: string) => apiFetch(`/orders/${orderId}/review`),
  createReview: (orderId: string, rating: number, comment: string) =>
    apiFetch(`/orders/${orderId}/review`, { method: "POST", body: JSON.stringify({ rating, comment }) }),
};

export const reportAPI = {
  createReport: (reportedExpertId: string, reason: string, description?: string) =>
    apiFetch("/reports", { method: "POST", body: JSON.stringify({ reportedExpertId, reason, description }) }),
};

export const adminAPI = {
  getStats: () => apiFetch("/admin/stats"),
  getUsers: () => apiFetch("/admin/users"),
  getServices: () => apiFetch("/admin/services"),
  deleteService: (id: string) => apiFetch(`/admin/services/${id}`, { method: "DELETE" }),
  updateService: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/admin/services/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateUserRole: (id: string, role: string) =>
    apiFetch(`/admin/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
  deleteUser: (id: string) => apiFetch(`/admin/users/${id}`, { method: "DELETE" }),
  createExpert: (email: string, password: string, fullName?: string, specialization?: string) =>
    apiFetch("/admin/experts", { method: "POST", body: JSON.stringify({ email, password, fullName, specialization }) }),
  getFlaggedExperts: () => apiFetch("/admin/flagged-experts"),
  getPlatformStats: () => apiFetch("/payments/platform-stats"),
  getPlatformFeeTransactions: () => apiFetch("/payments/platform-fees"),
  suspendExpert: (id: string) => apiFetch(`/admin/experts/${id}/suspend`, { method: "POST" }),
  unsuspendExpert: (id: string) => apiFetch(`/admin/experts/${id}/unsuspend`, { method: "POST" }),
  getReports: () => apiFetch("/reports"),
  updateReportStatus: (id: string, status: string) =>
    apiFetch(`/reports/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getAIConfig: () => apiFetch("/admin/ai-config"),
  updateAIConfig: (data: Record<string, unknown>) =>
    apiFetch("/admin/ai-config", { method: "PUT", body: JSON.stringify(data) }),
  getAIUsers: () => apiFetch("/admin/ai-users"),
  // Full access endpoints
  getOrders: () => apiFetch("/admin/orders"),
  updateOrder: (id: string, data: Record<string, unknown>) =>
    apiFetch(`/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteOrder: (id: string) => apiFetch(`/admin/orders/${id}`, { method: "DELETE" }),
  getReviews: () => apiFetch("/admin/reviews"),
  deleteReview: (id: string) => apiFetch(`/admin/reviews/${id}`, { method: "DELETE" }),
};

export const paymentAPI = {
  getBalance: () => apiFetch("/payments/balance"),
  deposit: (amount: number) => apiFetch("/payments/deposit", { method: "POST", body: JSON.stringify({ amount }) }),
  getTransactions: () => apiFetch("/payments/transactions"),
  payOrder: (orderId: string) => apiFetch(`/payments/orders/${orderId}/pay`, { method: "POST" }),
  confirmRelease: (orderId: string) => apiFetch(`/payments/orders/${orderId}/confirm-release`, { method: "POST" }),
  cancelOrder: (orderId: string) => apiFetch(`/payments/orders/${orderId}/cancel`, { method: "POST" }),
  getHeldFunds: () => apiFetch("/payments/admin/held-funds"),
  adminRelease: (orderId: string) => apiFetch(`/payments/admin/orders/${orderId}/release`, { method: "POST" }),
  adminRefund: (orderId: string) => apiFetch(`/payments/admin/orders/${orderId}/refund`, { method: "POST" }),
  purchaseAICredits: (credits: number) =>
    apiFetch("/payments/ai-credits", { method: "POST", body: JSON.stringify({ credits }) }),
  getAIUsage: () => apiFetch("/payments/ai-usage"),
};

export const sportCategoryAPI = {
  getAll: () => apiFetch("/sport-categories"),
  getById: (id: string) => apiFetch(`/sport-categories/${id}`),
  create: (data: { name: string; nameAr: string; icon: string; description: string; descriptionAr: string; sortOrder: number }) =>
    apiFetch("/sport-categories", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; nameAr?: string; icon?: string; description?: string; descriptionAr?: string; sortOrder?: number }) =>
    apiFetch(`/sport-categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/sport-categories/${id}`, { method: "DELETE" }),
};

export const uploadAPI = {
  uploadFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiUpload("/upload", fd);
  },
  uploadMultiple: (files: File[]) => {
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    return apiUpload("/upload/multiple", fd);
  },
};
