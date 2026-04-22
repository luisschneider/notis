import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeSeriesSection } from "@/components/admin/time-series-section";
import { WidgetPopularityChart } from "@/components/admin/widget-popularity-chart";
import { ProviderChart } from "@/components/admin/provider-chart";
import {
  getAdminMetrics,
  getSignupsOverTime,
  getBoardViewsOverTime,
  getWidgetPopularity,
  getRecentSignups,
  getMostViewedBoards,
  getMostActiveUsers,
} from "@/lib/server/admin-data";
import { Users, Eye, LayoutGrid, Link2 } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage(): Promise<React.JSX.Element> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const [
    metrics,
    signupsOverTime,
    boardViewsOverTime,
    widgetPopularity,
    recentSignups,
    mostViewedBoards,
    mostActiveUsers,
  ] = await Promise.all([
    getAdminMetrics(),
    getSignupsOverTime(startDate, endDate),
    getBoardViewsOverTime(startDate, endDate),
    getWidgetPopularity(),
    getRecentSignups(),
    getMostViewedBoards(),
    getMostActiveUsers(),
  ]);

  const totalConnected = metrics.connectedAccountsByProvider.reduce(
    (sum, p) => sum + p.count,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-sm text-muted-foreground">
          Platform usage metrics and growth data
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Board Views</CardTitle>
            <Eye className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalBoardViews.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Widgets</CardTitle>
            <LayoutGrid className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalWidgets.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
            <Link2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConnected.toLocaleString()}</div>
            {metrics.connectedAccountsByProvider.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {metrics.connectedAccountsByProvider
                  .map((p) => `${p.provider}: ${p.count}`)
                  .join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Series Charts */}
      <TimeSeriesSection
        initialSignups={signupsOverTime}
        initialBoardViews={boardViewsOverTime}
        initialFrom={startDate.toISOString()}
        initialTo={endDate.toISOString()}
      />

      {/* Widget Popularity + Provider Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Widget Popularity</CardTitle>
          </CardHeader>
          <CardContent>
            <WidgetPopularityChart data={widgetPopularity} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Provider Connections</CardTitle>
          </CardHeader>
          <CardContent>
            <ProviderChart data={metrics.connectedAccountsByProvider} />
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Recent Signups */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Signed Up</TableHead>
                  <TableHead className="text-right">Widgets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSignups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No users yet
                    </TableCell>
                  </TableRow>
                ) : (
                  recentSignups.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username || "—"}</TableCell>
                      <TableCell>{user.display_name || "—"}</TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">{user.widget_count}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Most Viewed Boards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Most Viewed Boards</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-right">Total Views</TableHead>
                  <TableHead>Board</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mostViewedBoards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No board views yet
                    </TableCell>
                  </TableRow>
                ) : (
                  mostViewedBoards.map((board) => (
                    <TableRow key={board.username}>
                      <TableCell className="font-medium">{board.username}</TableCell>
                      <TableCell className="text-right">{board.total_views.toLocaleString()}</TableCell>
                      <TableCell>
                        <Link
                          href={`/u/${board.username}`}
                          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                          target="_blank"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Most Active Users */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Most Active Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Display Name</TableHead>
                <TableHead className="text-right">Widgets Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mostActiveUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No users yet
                  </TableCell>
                </TableRow>
              ) : (
                mostActiveUsers.map((user) => (
                  <TableRow key={user.username}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.display_name || "—"}</TableCell>
                    <TableCell className="text-right">{user.widget_count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
