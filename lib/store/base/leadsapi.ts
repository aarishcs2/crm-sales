import { createApi } from "@reduxjs/toolkit/query/react";
import { optimizedFetchBaseQuery, CACHE_DURATIONS } from "../../utils/apiOptimizations";
export const leadsApi = createApi({
  reducerPath: "/api/leads/",
  baseQuery: optimizedFetchBaseQuery("/api/leads/leads"),
  keepUnusedDataFor: CACHE_DURATIONS.SHORT, // Shorter cache for leads data as it changes frequently
  refetchOnReconnect: true,
  refetchOnFocus: false,
  refetchOnMountOrArgChange: 300, // Refetch if it's been 5 minutes since last fetch
  endpoints: () => ({}),
});
