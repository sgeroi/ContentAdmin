import axios from "axios";
import { toast } from "@/hooks/use-toast";

// Determine if we're running in Replit
const isReplit = Boolean(import.meta.env.REPL_ID || import.meta.env.REPL_OWNER);

// For Replit, we don't need a base URL since the backend is served from the same origin
// For local development, we need to point to the Express server
const baseURL = isReplit ? "" : "http://0.0.0.0:5000";

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosClient.interceptors.request.use(
  (config) => {
    // Add /api prefix only when using relative URLs and when not already prefixed
    if (!config.url?.startsWith('http') && !config.url?.startsWith('/api')) {
      config.url = `/api${config.url?.startsWith('/') ? config.url : `/${config.url}`}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle different types of errors
    if (error.response) {
      // Server returned an error response (4xx, 5xx)
      const message = error.response.data || "Произошла ошибка при выполнении запроса";
      toast({
        title: "Ошибка",
        description: message,
        variant: "destructive",
      });
    } else if (error.request) {
      // Request was made but no response received
      toast({
        title: "Ошибка сети",
        description: "Не удалось связаться с сервером",
        variant: "destructive",
      });
    } else {
      // Something else happened while setting up the request
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }

    return Promise.reject(error);
  },
);

export default axiosClient;