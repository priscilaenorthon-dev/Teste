import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

interface DashboardStats {
  totalTools: number;
  availableTools: number;
  loanedTools: number;
  calibrationAlerts: number;
  recentLoans: Array<{
    id: string;
    toolName: string;
    toolCode: string;
    userName: string;
    loanDate: string;
    status: string;
  }>;
  upcomingCalibrations: Array<{
    id: string;
    toolName: string;
    toolCode: string;
    dueDate: string;
    daysRemaining: number;
  }>;
  usageByDepartment: Array<{
    department: string;
    totalLoans: number;
    activeLoans: number;
  }>;
  usageByClass: Array<{
    className: string;
    totalLoans: number;
    activeLoans: number;
  }>;
  usageOverTime: Array<{
    period: string;
    loans: number;
    returns: number;
  }>;
  topTools: Array<{
    toolId: string;
    toolName: string;
    toolCode: string;
    usageCount: number;
    lastLoanDate: string | null;
  }>;
  lowAvailabilityTools: Array<{
    toolId: string;
    toolName: string;
    toolCode: string;
    available: number;
    total: number;
  }>;
  overdueLoans: Array<{
    loanId: string;
    toolName: string;
    toolCode: string;
    userName: string;
    daysOverdue: number;
  }>;
}

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        
        <div className="grid lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const getUrgencyColor = (days: number) => {
    if (days <= 3) return "text-destructive";
    if (days <= 7) return "text-orange-600 dark:text-orange-500";
    return "text-yellow-600 dark:text-yellow-500";
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      active: { variant: "default" as const, label: "Ativo" },
      returned: { variant: "secondary" as const, label: "Devolvido" },
      overdue: { variant: "destructive" as const, label: "Atrasado" },
    };
    const config = variants[status as keyof typeof variants] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const usageByDepartment = stats?.usageByDepartment ?? [];
  const usageByClass = stats?.usageByClass ?? [];
  const usageOverTime = stats?.usageOverTime ?? [];
  const topTools = stats?.topTools ?? [];
  const lowAvailabilityTools = stats?.lowAvailabilityTools ?? [];
  const overdueLoans = stats?.overdueLoans ?? [];

  const departmentChartData = usageByDepartment.map((item) => ({
    department: item.department,
    emprestado: item.totalLoans,
    emUso: item.activeLoans,
  }));

  const classChartData = usageByClass.map((item) => ({
    className: item.className,
    emprestado: item.totalLoans,
    emUso: item.activeLoans,
  }));

  const usageOverTimeData = usageOverTime.map((item) => ({
    period: item.period,
    emprestimos: item.loans,
    devolucoes: item.returns,
  }));

  const abbreviateLabel = (value: string) =>
    value.length > 12 ? `${value.slice(0, 12)}…` : value;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do Sistema JOMAGA</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Link href="/tools" data-testid="link-total-tools">
          <Card data-testid="card-total-tools" className="cursor-pointer hover-elevate active-elevate-2 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Ferramentas</CardTitle>
              <span className="material-icons text-primary text-2xl">build</span>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="text-total-tools">
                {stats?.totalTools || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastradas no sistema
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/loans" data-testid="link-loaned-tools">
          <Card data-testid="card-loaned-tools" className="cursor-pointer hover-elevate active-elevate-2 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ferramentas Emprestadas</CardTitle>
              <span className="material-icons text-orange-600 dark:text-orange-500 text-2xl">input</span>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="text-loaned-tools">
                {stats?.loanedTools || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Atualmente em uso
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/calibration" data-testid="link-calibration-alerts">
          <Card data-testid="card-calibration-alerts" className="cursor-pointer hover-elevate active-elevate-2 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas de Calibração</CardTitle>
              <span className="material-icons text-destructive text-2xl">event</span>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="text-calibration-alerts">
                {stats?.calibrationAlerts || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Próximas do vencimento
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">analytics</span>
              Uso por Setor
            </CardTitle>
            <CardDescription>
              Quantidade de ferramentas emprestadas e em uso por departamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!departmentChartData.length ? (
              <div className="flex h-[280px] flex-col items-center justify-center text-muted-foreground">
                <span className="material-icons text-4xl mb-2">bar_chart</span>
                <p>Sem movimentações registradas.</p>
              </div>
            ) : (
              <ChartContainer
                className="h-[300px]"
                config={{
                  emprestado: {
                    label: "Emprestado",
                    color: "hsl(var(--chart-1))",
                  },
                  emUso: {
                    label: "Em uso",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <BarChart data={departmentChartData}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="department"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={abbreviateLabel}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="emprestado"
                    fill="var(--color-emprestado)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="emUso" fill="var(--color-emUso)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">leaderboard</span>
              Ferramentas Mais Usadas
            </CardTitle>
            <CardDescription>Top ferramentas por volume de uso</CardDescription>
          </CardHeader>
          <CardContent>
            {!topTools.length ? (
              <div className="text-center py-10 text-muted-foreground">
                <span className="material-icons text-4xl mb-2 block">inventory</span>
                <p>Nenhuma movimentação registrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topTools.map((tool, index) => (
                  <div
                    key={tool.toolId}
                    className="flex items-center justify-between gap-4"
                    data-testid={`top-tool-${tool.toolId}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{tool.toolName}</p>
                        <p className="text-xs text-muted-foreground">
                          <code className="font-mono bg-muted px-1.5 py-0.5 rounded mr-1">{tool.toolCode}</code>
                          {tool.usageCount} usos
                        </p>
                      </div>
                    </div>
                    {tool.lastLoanDate ? (
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(tool.lastLoanDate), "dd/MM", { locale: ptBR })}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">category</span>
              Uso por Classe de Ferramenta
            </CardTitle>
            <CardDescription>
              Comparativo de empréstimos entre classes cadastradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!classChartData.length ? (
              <div className="flex h-[280px] flex-col items-center justify-center text-muted-foreground">
                <span className="material-icons text-4xl mb-2">stacked_bar_chart</span>
                <p>Nenhum dado disponível.</p>
              </div>
            ) : (
              <ChartContainer
                className="h-[300px]"
                config={{
                  emprestado: {
                    label: "Emprestado",
                    color: "hsl(var(--chart-3))",
                  },
                  emUso: {
                    label: "Em uso",
                    color: "hsl(var(--chart-4))",
                  },
                }}
              >
                <BarChart data={classChartData}>
                  <CartesianGrid vertical={false} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="className"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={abbreviateLabel}
                  />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey="emprestado"
                    fill="var(--color-emprestado)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar dataKey="emUso" fill="var(--color-emUso)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">timeline</span>
              Tendência de Uso
            </CardTitle>
            <CardDescription>
              Empréstimos e devoluções nos últimos seis meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!usageOverTimeData.length ||
            usageOverTimeData.every((item) => !item.emprestimos && !item.devolucoes) ? (
              <div className="flex h-[280px] flex-col items-center justify-center text-muted-foreground">
                <span className="material-icons text-4xl mb-2">show_chart</span>
                <p>Nenhum histórico recente.</p>
              </div>
            ) : (
              <ChartContainer
                className="h-[300px]"
                config={{
                  emprestimos: {
                    label: "Empréstimos",
                    color: "hsl(var(--chart-5))",
                  },
                  devolucoes: {
                    label: "Devoluções",
                    color: "hsl(var(--chart-2))",
                  },
                }}
              >
                <LineChart data={usageOverTimeData}>
                  <CartesianGrid strokeDasharray="4 4" />
                  <XAxis dataKey="period" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line
                    type="monotone"
                    dataKey="emprestimos"
                    stroke="var(--color-emprestimos)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="devolucoes"
                    stroke="var(--color-devolucoes)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">schedule</span>
              Empréstimos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recentLoans?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <span className="material-icons text-4xl mb-2 block">inbox</span>
                <p>Nenhum empréstimo recente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentLoans.map((loan) => (
                  <div
                    key={loan.id}
                    className="flex items-start justify-between p-3 rounded-md bg-muted/50 gap-4"
                    data-testid={`loan-${loan.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{loan.toolName}</span>
                        <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                          {loan.toolCode}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {loan.userName} • {format(new Date(loan.loanDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    {getStatusBadge(loan.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">warning</span>
              Calibrações Próximas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.upcomingCalibrations?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <span className="material-icons text-4xl mb-2 block">check_circle</span>
                <p>Nenhuma calibração pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.upcomingCalibrations.map((calibration) => (
                  <div
                    key={calibration.id}
                    className="flex items-start justify-between p-3 rounded-md border gap-4"
                    data-testid={`calibration-${calibration.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">{calibration.toolName}</span>
                        <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                          {calibration.toolCode}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {format(new Date(calibration.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <div className={`flex items-center gap-1 ${getUrgencyColor(calibration.daysRemaining)}`}>
                      <span className="material-icons text-sm">event</span>
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {calibration.daysRemaining} dias
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="material-icons">notifications_active</span>
            Alertas Automáticos
          </CardTitle>
          <CardDescription>
            Monitoramento contínuo de calibração, disponibilidade e atrasos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="material-icons text-primary">build_circle</span>
                Calibrações em alerta
              </div>
              <Badge variant={stats?.calibrationAlerts ? "destructive" : "outline"}>
                {stats?.calibrationAlerts || 0}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.calibrationAlerts
                ? "Ferramentas precisam de calibração nos próximos 10 dias."
                : "Nenhuma calibração próxima do vencimento."}
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="material-icons text-amber-500">inventory_2</span>
                Baixa disponibilidade
              </div>
              <Badge variant={lowAvailabilityTools.length ? "destructive" : "outline"}>
                {lowAvailabilityTools.length}
              </Badge>
            </div>
            {lowAvailabilityTools.length ? (
              <div className="space-y-2">
                {lowAvailabilityTools.slice(0, 3).map((tool) => (
                  <div
                    key={tool.toolId}
                    className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{tool.toolName}</p>
                      <p className="text-xs text-muted-foreground">
                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded mr-1">{tool.toolCode}</code>
                        {tool.available}/{tool.total} disponíveis
                      </p>
                    </div>
                    <span className="material-icons text-sm text-destructive">priority_high</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum alerta de disponibilidade.</p>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="material-icons text-destructive">schedule</span>
                Empréstimos em atraso
              </div>
              <Badge variant={overdueLoans.length ? "destructive" : "outline"}>
                {overdueLoans.length}
              </Badge>
            </div>
            {overdueLoans.length ? (
              <div className="space-y-2">
                {overdueLoans.slice(0, 3).map((loan) => (
                  <div
                    key={loan.loanId}
                    className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{loan.toolName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {loan.userName || "Usuário removido"} •
                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded ml-1">{loan.toolCode}</code>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-destructive">
                        {loan.daysOverdue} dias
                      </p>
                      <p className="text-xs text-muted-foreground">em atraso</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhum empréstimo em atraso.</p>
            )}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
