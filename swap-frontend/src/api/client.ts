import axios from "axios";

export type SwapMode = "cex" | "dex";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
});

export type VisitLogPayload = {
  userAgent: string;
  referrer: string;
  page: Record<string, unknown>;
  system: Record<string, unknown>;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Something went wrong";

    return Promise.reject(new Error(message));
  }
);

export const logUserAgent = async (payload: VisitLogPayload) => {
  const res = await api.post('/log-user-agent', payload);
  return res.data;
}

export const getCurrencies = async (mode: SwapMode = "cex") => {
  const res = await api.get("/currencies", {
    params: {
      provider: mode,
    },
  });
  return res.data.data;
};

export const getPairs = async (fixed: boolean, mode: SwapMode = "cex") => {
  const res = await api.get("/pairs", {
    params: {
      fixed,
      provider: mode,
    },
  });

  return res.data.data;
};

export const getEstimate = async (payload: any) => {
  const res = await api.post("/estimate", payload);
  
  return res.data.data;
};

export const getRanges = async (payload: any) => {
  const res = await api.post("/ranges", payload);
  return res.data.data;
};

export const checkExchange = async (payload: any) => {
  const res = await api.post("/exchange/check", payload);
  return res.data.data;
};

export const createExchange = async (payload: any) => {
  const res = await api.post("/exchange", payload);
  return res.data.data;
};

export const prepareExchangeTransaction = async (id: string, payload: any) => {
  const res = await api.post(`/exchange/${id}/prepare`, payload);
  return res.data.data;
};

export const getExchange = async (id: string) => {
  const res = await api.get(`/exchange/${id}`);
  return res.data.data;
};

export const confirmExchange = async (payload: any) => {
  const res = await api.put("/exchange/confirm", payload);
  return res.data.data;
};
