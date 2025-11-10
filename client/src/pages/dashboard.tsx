import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do Sistema JOMAGA</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card data-testid="card-total-tools">
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

        <Card data-testid="card-loaned-tools">
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

        <Card data-testid="card-calibration-alerts">
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
    </div>
  );
}
