import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE || "http://127.0.0.1:5010";
export const api = axios.create({
  baseURL,
  withCredentials: true,
});
