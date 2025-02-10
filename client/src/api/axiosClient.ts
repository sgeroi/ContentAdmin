import axios from "axios";
import { toast } from "@/hooks/use-toast";

// Determine if we're running in Replit
const isReplit = Boolean(import.meta.env.REPL_ID || import.meta.env.REPL_OWNER);

// Set the base URL based on environment
const baseURL = isReplit ? "" : "http://localhost:5000";

const axiosClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

axiosClient.interceptors.request.use(
  (config) => {
    // Ensure API prefix is added
    if (config.url && !config.url.startsWith('http')) {
      config.url = `/api${config.url.startsWith('/') ? config.url : `/${config.url}`}`;
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