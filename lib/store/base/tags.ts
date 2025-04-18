import { createApi } from "@reduxjs/toolkit/query/react";
import { optimizedFetchBaseQuery, CACHE_DURATIONS } from "../../utils/apiOptimizations";

export const TagsApi = createApi({
  reducerPath: "/api/tags/",
  baseQuery: optimizedFetchBaseQuery("/api/tags/tags"),
  endpoints: () => ({}),
  keepUnusedDataFor: CACHE_DURATIONS.LONG, // Tags change infrequently
  refetchOnReconnect: true,
  refetchOnFocus: false,
  refetchOnMountOrArgChange: false,
});
