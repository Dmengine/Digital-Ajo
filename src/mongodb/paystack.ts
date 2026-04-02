import axios, { type AxiosInstance } from "axios";
import { env } from "../config/env";

let client: AxiosInstance | null = null;

export const getPaystack = (): AxiosInstance => {
  if (!client) {
    client = axios.create({
      baseURL: "https://api.paystack.co",
      headers: {
        Authorization: `Bearer ${env.paystackSecret()}`,
        "Content-Type": "application/json",
      },
    });
  }
  return client;
};
