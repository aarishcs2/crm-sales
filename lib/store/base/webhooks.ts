import { createApi } from "@reduxjs/toolkit/query/react";
import { optimizedFetchBaseQuery, CACHE_DURATIONS } from "../../utils/apiOptimizations";
export const webhookApi = createApi({
  reducerPath: "/api/webhooks/",
  baseQuery: optimizedFetchBaseQuery("/api/webhooks/webhooks"),
  endpoints: () => ({}),
  keepUnusedDataFor: CACHE_DURATIONS.MEDIUM,
  refetchOnReconnect: true,
  refetchOnFocus: false,
  refetchOnMountOrArgChange: false,
});
