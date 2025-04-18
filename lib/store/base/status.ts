import { createApi } from "@reduxjs/toolkit/query/react";
import { optimizedFetchBaseQuery, CACHE_DURATIONS } from "../../utils/apiOptimizations";
export const statusApi = createApi({
  reducerPath: "/api/status/",
  baseQuery: optimizedFetchBaseQuery("/api/status/status"),
  endpoints: () => ({}),
  keepUnusedDataFor: CACHE_DURATIONS.MEDIUM,
  refetchOnReconnect: true,
  refetchOnFocus: false,
  refetchOnMountOrArgChange: false,
});
