import type { ApiResponse } from "@tetris/shared-types";

export function successResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta: {}
  };
}
