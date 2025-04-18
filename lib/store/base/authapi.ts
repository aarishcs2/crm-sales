import { createApi } from "@reduxjs/toolkit/query/react";
import { optimizedFetchBaseQuery, CACHE_DURATIONS } from "../../utils/apiOptimizations";
import { RootState } from "../store";

export const api = createApi({
  reducerPath: "api",
  baseQuery: optimizedFetchBaseQuery("/api/auth"),
  keepUnusedDataFor: CACHE_DURATIONS.MEDIUM,
  refetchOnReconnect: true,
  refetchOnFocus: false, // Prevent unnecessary refetches when window regains focus
  refetchOnMountOrArgChange: false, // Only refetch if explicitly requested or cache expired
  endpoints: () => ({}),
});
