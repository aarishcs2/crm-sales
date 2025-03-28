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
import { Award, IndianRupee, TrendingUp, UserPlus, Users } from "lucide-react";
import { memo, useMemo } from "react";
import { useSelector } from "react-redux";
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
  const isCollapsed = useSelector(
    (state: RootState) => state.sidebar.isCollapsed
  );

  const { data: activeWorkspace, isLoading: isWorkspaceLoading } =
    useGetActiveWorkspaceQuery();
  const workspaceId = activeWorkspace?.data?.id;

  const { data: workspaceRevenue, isLoading: isRevenueLoading } =
    useGetRevenueByWorkspaceQuery(workspaceId, { skip: !workspaceId });
  const { data: ROC, isLoading: isRocLoading } = useGetROCByWorkspaceQuery(
    workspaceId,
    { skip: !workspaceId }
  );
  const { data: qualifiedCount, isLoading: isQualifiedCountLoading } =
    useGetQualifiedCountQuery(workspaceId, { skip: !workspaceId });
  const { data: workspaceCount, isLoading: isCountLoading } =
    useGetCountByWorkspaceQuery(workspaceId, { skip: !workspaceId });
  const { data: webhooks, isLoading: isWebhooksLoading } =
    useGetWebhooksBySourceIdQuery(
      { workspaceId, id: ROC?.top_source_id },
      { skip: !workspaceId || !ROC?.top_source_id }
    );

  const isLoading = useMemo(
    () =>
      isWorkspaceLoading ||
      (workspaceId &&
        (isRevenueLoading ||
          isRocLoading ||
          isCountLoading ||
          isQualifiedCountLoading ||
          isWebhooksLoading)),
    [
      isWorkspaceLoading,
      workspaceId,
      isRevenueLoading,
      isRocLoading,
      isCountLoading,
      isQualifiedCountLoading,
      isWebhooksLoading,
    ]
  );

  const dashboardStats = useMemo(
    () => [
      {
        icon: <IndianRupee className="text-green-500" />,
        title: "Revenue",
        value: workspaceRevenue?.totalRevenue.toFixed(2) || "0",
        change: workspaceRevenue?.change || "+0%",
      },
      {
        icon: <UserPlus className="text-orange-500" />,
        title: "Qualified Leads",
        value: qualifiedCount?.qualifiedLeadsCount || "0",
      },
      {
        icon: <Users className="text-blue-500" />,
        title: "New Leads",
        value: workspaceCount?.arrivedLeadsCount || 0,
        change: "+8.3%",
      },
      {
        icon: <TrendingUp className="text-purple-500" />,
        title: "Conversion Rate",
        value: `${ROC?.conversion_rate || 0}%`,
        change: "+3.2%",
      },
      {
        icon: <Award className="text-yellow-500" />,
        title: "Top Performing Sources",
        value: webhooks?.name || "N/A",
        change: "5 Deals",
      },
    ],
    [workspaceRevenue, qualifiedCount, workspaceCount, ROC, webhooks]
  );

  const salesData = useMemo(
    () =>
      (ROC?.monthly_stats || []).map(({ month, convertedLeads }: any) => ({
        month,
        sales: convertedLeads,
      })),
    [ROC]
  );

  const containerClassName = useMemo(
    () =>
      `grid grid-rows-2 md:grid-rows-[25%_75%] gap-0 md:gap-2 transition-all duration-500 ease-in-out px-2 py-6 w-auto ${
        isCollapsed ? "md:ml-[80px]" : "md:ml-[250px]"
      } overflow-hidden`,
    [isCollapsed]
  );

  if (isLoading) {
    return (
      <div className={containerClassName}>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 h-[322px] md:h-auto">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <SkeletonChart />
      </div>
    );
  }

  return (
    <div className={containerClassName}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 sm:gap-6 h-[322px] md:h-auto">
        {dashboardStats.map((stat, index) => (
          <StatCard
            key={stat.title} // Use title as a stable key
            stat={stat}
            index={index}
            totalStats={dashboardStats.length}
          />
        ))}
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
