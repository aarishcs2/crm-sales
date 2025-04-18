"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetWebhooksBySourceIdQuery } from "@/lib/store/services/webhooks";
import {
  useGetActiveWorkspaceQuery,
  useGetCountByWorkspaceQuery,
  useGetQualifiedCountQuery,
  useGetRevenueByWorkspaceQuery,
  useGetROCByWorkspaceQuery,
} from "@/lib/store/services/workspace";
import { RootState } from "@/lib/store/store";
import { useConstant, useDebounce } from "@/lib/utils/renderOptimizations";
import { Award, IndianRupee, TrendingUp, UserPlus, Users } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallowEqual, useSelector } from "react-redux";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const SkeletonCard = memo(() => (
  <Card className="animate-pulse">
    <CardContent className="p-4 sm:p-6 flex items-center justify-between space-x-4 sm:space-x-6">
      <div className="w-8 h-8 bg-gray-300 rounded-full shrink-0" />
      <div className="min-w-0 flex-grow space-y-2">
        <div className="h-4 w-20 bg-gray-300 rounded" />
        <div className="h-6 w-32 bg-gray-300 rounded" />
      </div>
    </CardContent>
  </Card>
));
SkeletonCard.displayName = "SkeletonCard";

const SkeletonChart = memo(() => (
  <Card className="w-full animate-pulse">
    <CardHeader className="p-4 sm:p-6">
      <div className="h-5 w-40 bg-gray-300 rounded" />
    </CardHeader>
    <CardContent className="p-4 sm:p-6">
      <div className="w-full h-[250px] sm:h-[300px] bg-gray-300 rounded" />
    </CardContent>
  </Card>
));
SkeletonChart.displayName = "SkeletonChart";

const StatCard = memo(({ stat, index, totalStats }: any) => (
  <Card
    className={`hover:shadow-md transition-shadow ${
      index === totalStats - 1 ? "col-span-full sm:col-auto" : ""
    }`}
  >
    <CardContent className="p-4 sm:p-6 flex items-center justify-between space-x-4 sm:space-x-6">
      <div className="shrink-0">{stat.icon}</div>
      <div className="min-w-0 md:flex-grow">
        <p className="text-xs sm:text-sm text-muted-foreground truncate mb-1">
          {stat.title}
        </p>
        <p
          className="text-lg sm:text-xl font-semibold truncate cursor-pointer"
        >
          {stat.value}
        </p>
      </div>
    </CardContent>
  </Card>
));
StatCard.displayName = "StatCard";

interface Workspace {
  id: string;
  name: string;
  role: string;
  industry?: string;
  status?: boolean;
  type?: string;
}

const SalesDashboard = memo(() => {
  // Use shallowEqual for more accurate comparison to prevent unnecessary re-renders
  const isCollapsed = useSelector(
    (state: RootState) => state.sidebar.isCollapsed,
    shallowEqual
  );

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch active workspace
  const { data: activeWorkspace, isLoading: isWorkspaceLoading } =
    useGetActiveWorkspaceQuery();

  // Extract and memoize workspace ID to prevent unnecessary re-renders
  const workspaceId = useMemo(() => activeWorkspace?.data?.id, [activeWorkspace]);

  // Debounce workspace ID changes to prevent rapid API calls when switching workspaces
  const debouncedWorkspaceId = useDebounce(workspaceId, 300);

  // Only fetch data when we have a stable workspace ID
  const shouldFetch = !!debouncedWorkspaceId;

  // Fetch workspace data with optimized dependencies
  const { data: workspaceRevenue, isLoading: isRevenueLoading } =
    useGetRevenueByWorkspaceQuery(debouncedWorkspaceId, { skip: !shouldFetch });

  const { data: ROC, isLoading: isRocLoading } = useGetROCByWorkspaceQuery(
    debouncedWorkspaceId,
    { skip: !shouldFetch }
  );

  const { data: qualifiedCount, isLoading: isQualifiedCountLoading } =
    useGetQualifiedCountQuery(debouncedWorkspaceId, { skip: !shouldFetch });

  const { data: workspaceCount, isLoading: isCountLoading } =
    useGetCountByWorkspaceQuery(debouncedWorkspaceId, { skip: !shouldFetch });

  // Only fetch webhooks when we have both workspace ID and top source ID
  const topSourceId = ROC?.top_source_id;
  const shouldFetchWebhooks = shouldFetch && !!topSourceId;

  const { data: webhooks, isLoading: isWebhooksLoading } =
    useGetWebhooksBySourceIdQuery(
      { workspaceId: debouncedWorkspaceId, id: topSourceId },
      { skip: !shouldFetchWebhooks }
    );

  // Optimize loading state calculation with useConstant for the function
  // and useMemo for the actual calculation
  const calculateLoading = useConstant(() =>
    (isWorkspaceLoading: boolean, hasWorkspace: boolean, otherLoadingStates: boolean[]) => {
      if (isWorkspaceLoading) return true;
      if (!hasWorkspace) return false;
      return otherLoadingStates.some(state => state);
    }
  );

  const isLoading = useMemo(
    () => calculateLoading(
      isWorkspaceLoading,
      !!debouncedWorkspaceId,
      [isRevenueLoading, isRocLoading, isCountLoading, isQualifiedCountLoading, isWebhooksLoading]
    ),
    [
      calculateLoading,
      isWorkspaceLoading,
      debouncedWorkspaceId,
      isRevenueLoading,
      isRocLoading,
      isCountLoading,
      isQualifiedCountLoading,
      isWebhooksLoading,
    ]
  );

  // Pre-calculate values to avoid recalculations in the render phase
  const revenueValue = useMemo(
    () => workspaceRevenue?.totalRevenue?.toFixed(2) || "0",
    [workspaceRevenue]
  );

  const qualifiedLeadsValue = useMemo(
    () => qualifiedCount?.qualifiedLeadsCount || "0",
    [qualifiedCount]
  );

  const newLeadsValue = useMemo(
    () => workspaceCount?.arrivedLeadsCount || 0,
    [workspaceCount]
  );

  const conversionRateValue = useMemo(
    () => `${ROC?.conversion_rate || 0}%`,
    [ROC]
  );

  const topSourceValue = useMemo(
    () => webhooks?.name || "N/A",
    [webhooks]
  );

  // Create icons only once
  const icons = useConstant(() => ({
    revenue: <IndianRupee className="text-green-500" />,
    qualifiedLeads: <UserPlus className="text-orange-500" />,
    newLeads: <Users className="text-blue-500" />,
    conversionRate: <TrendingUp className="text-purple-500" />,
    topSources: <Award className="text-yellow-500" />
  }));

  // Optimize dashboard stats creation
  const dashboardStats = useMemo(
    () => [
      {
        icon: icons.revenue,
        title: "Revenue",
        value: revenueValue,
        change: workspaceRevenue?.change || "+0%",
      },
      {
        icon: icons.qualifiedLeads,
        title: "Qualified Leads",
        value: qualifiedLeadsValue,
      },
      {
        icon: icons.newLeads,
        title: "New Leads",
        value: newLeadsValue,
        change: "+8.3%",
      },
      {
        icon: icons.conversionRate,
        title: "Conversion Rate",
        value: conversionRateValue,
        change: "+3.2%",
      },
      {
        icon: icons.topSources,
        title: "Top Performing Sources",
        value: topSourceValue,
        change: "5 Deals",
      },
    ],
    [icons, revenueValue, qualifiedLeadsValue, newLeadsValue, conversionRateValue, topSourceValue, workspaceRevenue?.change]
  );

  // Optimize sales data transformation
  const salesData = useMemo(
    () => {
      const monthlyStats = ROC?.monthly_stats || [];
      // Pre-allocate array for better performance
      const result = new Array(monthlyStats.length);

      for (let i = 0; i < monthlyStats.length; i++) {
        const { month, convertedLeads } = monthlyStats[i];
        result[i] = { month, sales: convertedLeads };
      }

      return result;
    },
    [ROC]
  );

  // Optimize class name generation
  const baseContainerClassName = useConstant(() =>
    "grid grid-rows-2 md:grid-rows-[25%_75%] gap-0 md:gap-2 transition-all duration-500 ease-in-out px-2 py-6 w-auto"
  );

  const containerClassName = useMemo(
    () => `${baseContainerClassName} ${
      isCollapsed ? "md:ml-[80px]" : "md:ml-[250px]"
    } overflow-hidden`,
    [baseContainerClassName, isCollapsed]
  );

  // Create skeleton cards array only once
  const skeletonCards = useConstant(() =>
    Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} />)
  );

  // Optimize loading state rendering
  if (isLoading) {
    return (
      <div className={containerClassName}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 h-[322px] md:h-auto">
          {skeletonCards}
        </div>
        <SkeletonChart />
      </div>
    );
  }

  // Memoize the stat cards to prevent unnecessary re-renders
  const statCards = useMemo(() => {
    return dashboardStats.map((stat, index) => (
      <StatCard
        key={stat.title} // Use title as a stable key
        stat={stat}
        index={index}
        totalStats={dashboardStats.length}
      />
    ));
  }, [dashboardStats]);

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 h-[322px] md:h-auto">
        {statCards}
      </div>

      <Card className="w-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">
            Monthly Sales Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="w-full h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={salesData}
                margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
              >
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

SalesDashboard.displayName = "SalesDashboard";

export default SalesDashboard;
