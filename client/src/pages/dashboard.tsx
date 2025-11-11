import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";

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
  overdueCalibrations: Array<{
    id: string;
    toolName: string;
    toolCode: string;
    dueDate: string;
    daysOverdue: number;
  }>;
  availabilityRate: number;
  statusBreakdown: Array<{
    status: string;
    quantity: number;
    percentage: number;
  }>;
  loanActivity: Array<{
    date: string;
    loans: number;
    returns: number;
  }>;
  activeLoanLeaders: Array<{
    toolId: string;
    toolName: string;
    toolCode: string;
    quantityLoaned: number;
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

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-3">
          <Skeleton className="h-[320px] xl:col-span-2" />
          <Skeleton className="h-[320px]" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-[360px]" />
          <Skeleton className="h-[360px]" />
          <Skeleton className="h-[360px]" />
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

  const overdueCalibrationCount = stats?.overdueCalibrations?.length ?? 0;
  const availabilityRate = stats?.availabilityRate ?? 0;
  const loanedPercentage =
    stats?.totalTools && stats.totalTools > 0
      ? Math.round(((stats.loanedTools || 0) / stats.totalTools) * 100)
      : undefined;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do Sistema JOMAGA</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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

        <Link href="/tools" data-testid="link-available-tools">
          <Card data-testid="card-available-tools" className="cursor-pointer hover-elevate active-elevate-2 transition-transform">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ferramentas Disponíveis</CardTitle>
              <span className="material-icons text-emerald-600 dark:text-emerald-500 text-2xl">check_circle</span>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold" data-testid="text-available-tools">
                {stats?.availableTools || 0}
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Taxa de disponibilidade</span>
                  <span className="font-medium text-foreground">
                    {availabilityRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={availabilityRate} className="h-2" />
              </div>
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
                {loanedPercentage !== undefined
                  ? `${loanedPercentage}% do total`
                  : "Atualmente em uso"}
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
              {overdueCalibrationCount ? (
                <p className="text-xs text-destructive mt-2 font-medium">
                  {overdueCalibrationCount} calibrações atrasadas
                </p>
              ) : null}
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">analytics</span>
              Movimentação de Ferramentas (14 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.loanActivity?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <span className="material-icons text-4xl mb-2 block">insights</span>
                <p>Sem movimentações registradas no período</p>
              </div>
            ) : (
              <ChartContainer
                config={{
                  loans: {
                    label: "Empréstimos",
                    color: "hsl(var(--chart-1))",
                  },
                  returns: {
                    label: "Devoluções",
                    color: "hsl(var(--chart-2))",
                  },
                }}
                className="h-[260px]"
              >
                <AreaChart
                  data={(stats?.loanActivity ?? []).map((activity) => ({
                    ...activity,
                    date: format(new Date(`${activity.date}T00:00:00`), "dd/MM", {
                      locale: ptBR,
                    }),
                  }))}
                  margin={{ left: 12, right: 12, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} width={32} />
                  <RechartsTooltip content={<ChartTooltipContent />} cursor={false} />
                  <Area
                    dataKey="loans"
                    type="monotone"
                    stroke="var(--color-loans)"
                    fill="var(--color-loans)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Empréstimos"
                  />
                  <Area
                    dataKey="returns"
                    type="monotone"
                    stroke="var(--color-returns)"
                    fill="var(--color-returns)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Devoluções"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">inventory</span>
              Resumo do Estoque
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.statusBreakdown?.length ? (
              <div className="text-center py-6 text-muted-foreground">
                <span className="material-icons text-4xl mb-2 block">inventory_2</span>
                <p>Nenhuma ferramenta cadastrada</p>
              </div>
            ) : (
              <div className="space-y-4">
                {(stats?.statusBreakdown ?? []).map((status) => {
                  const labels: Record<string, string> = {
                    available: "Disponíveis",
                    loaned: "Emprestadas",
                    calibration: "Em calibração",
                    out_of_service: "Fora de serviço",
                    maintenance: "Em manutenção",
                    unknown: "Sem status",
                  };

                  return (
                    <div key={status.status}>
                      <div className="flex items-center justify-between text-sm font-medium">
                        <span>{labels[status.status] || status.status}</span>
                        <span>{status.quantity}</span>
                      </div>
                      <Progress value={status.percentage} className="h-2 mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {status.percentage.toFixed(1)}% do total
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
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
                {(stats?.recentLoans ?? []).map((loan) => (
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
                {(stats?.upcomingCalibrations ?? []).map((calibration) => (
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="material-icons">workspace_premium</span>
              Destaques de Empréstimo Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.activeLoanLeaders?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <span className="material-icons text-4xl mb-2 block">verified</span>
                <p>Sem ferramentas emprestadas no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.activeLoanLeaders ?? []).map((item, index) => (
                  <div
                    key={item.toolId}
                    className="flex items-start justify-between gap-3 rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <span className="font-medium text-sm">{item.toolName}</span>
                      </div>
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        {item.toolCode}
                      </code>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{item.quantityLoaned}</p>
                      <p className="text-xs text-muted-foreground">unidades emprestadas</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(stats?.overdueCalibrations?.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <span className="material-icons">report</span>
              Calibrações Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {(stats?.overdueCalibrations ?? []).map((calibration) => (
                <div
                  key={calibration.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{calibration.toolName}</p>
                    <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                      {calibration.toolCode}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      Vencida em {format(new Date(calibration.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="text-right text-destructive">
                    <p className="text-sm font-semibold">
                      {calibration.daysOverdue} dias
                    </p>
                    <p className="text-xs">em atraso</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
