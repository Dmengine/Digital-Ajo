import type { AxiosError } from "axios";

export function getAxiosErrorMessage(err: unknown, fallback = "Something went wrong") {
  const e = err as AxiosError<any>;
  return (
    (e.response?.data?.message as string | undefined) ||
    (e.response?.data?.error as string | undefined) ||
    e.message ||
    fallback
  );
}

