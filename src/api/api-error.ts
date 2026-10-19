import type { AxiosError } from "axios";

/**
 * The api's own error code (`error.code`) of a failed call. The api answers
 * errors with a 400, which the client rejects, so the code sits on the rejected
 * error's response; a resolved reply that is not a success carries it too.
 */
export function apiErrorCode(failure: unknown): number | undefined {
  const reply = failure as AxiosError<{ error?: { code?: number } }> & {
    error?: { code?: number };
  };
  return reply?.response?.data?.error?.code ?? reply?.error?.code;
}
