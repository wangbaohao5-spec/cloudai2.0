import { NextResponse } from "next/server";

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function jsonError(error: unknown, fallback: string, status = 500) {
  return NextResponse.json(
    {
      error: getErrorMessage(error, fallback),
    },
    { status },
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
