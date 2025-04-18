import { createApi } from "@reduxjs/toolkit/query/react";
import { optimizedFetchBaseQuery, CACHE_DURATIONS } from "../../utils/apiOptimizations";
export const membersApi = createApi({
  reducerPath: "/api/members/",
  baseQuery: optimizedFetchBaseQuery("/api/members/members"),
  endpoints: () => ({}),
  keepUnusedDataFor: CACHE_DURATIONS.MEDIUM,
  refetchOnReconnect: true,
  refetchOnFocus: false,
  refetchOnMountOrArgChange: false,
});
