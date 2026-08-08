import { NextResponse } from "next/server";

export class ApiError extends Error {
  status: number;
  headers?: HeadersInit;

  constructor(message: string, status: number, headers?: HeadersInit) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.headers = headers;
  }
}

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function jsonError(error: unknown, fallback: string, status = 500) {
  const apiError = error instanceof ApiError ? error : null;

  return NextResponse.json(
    {
      error: getErrorMessage(error, fallback),
    },
    {
      status: apiError?.status || status,
      headers: apiError?.headers,
    },
  );
}

export async function settleTask<T>(task: Promise<T>) {
  try {
    return {
      data: await task,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getErrorMessage(error, "Operation failed."),
    };
  }
}
