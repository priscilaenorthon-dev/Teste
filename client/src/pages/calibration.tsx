import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tool } from "@shared/schema";

export default function Calibration() {
  const { data: tools, isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const calibrationTools = tools?.filter(t => 
    (t as any).model?.requiresCalibration && t.nextCalibrationDate
  ) || [];

  const now = new Date();
  const urgentCalibrations = calibrationTools.filter(t => {
    const daysUntil = differenceInDays(new Date(t.nextCalibrationDate!), now);
    return daysUntil <= 10 && daysUntil >= 0;
  });

  const overdueCalibrations = calibrationTools.filter(t => {
    const daysUntil = differenceInDays(new Date(t.nextCalibrationDate!), now);
    return daysUntil < 0;
  });

  const upcomingCalibrations = calibrationTools.filter(t => {
    const daysUntil = differenceInDays(new Date(t.nextCalibrationDate!), now);
    return daysUntil > 10;
  });

  const getUrgencyBadge = (daysRemaining: number) => {
    if (daysRemaining < 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <span className="material-icons text-xs">error</span>
          Vencida
        </Badge>
      );
    }
    if (daysRemaining <= 3) {
      return (
        <Badge variant="destructive" className="gap-1">
          <span className="material-icons text-xs">warning</span>
          Urgente
        </Badge>
      );
    }
    if (daysRemaining <= 7) {
      return (
        <Badge variant="outline" className="gap-1 text-orange-600 dark:text-orange-500 border-orange-600 dark:border-orange-500">
          <span className="material-icons text-xs">schedule</span>
          Atenção
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <span className="material-icons text-xs">check_circle</span>
        Normal
      </Badge>
    );
  };

  const sortedTools = [...urgentCalibrations, ...overdueCalibrations, ...upcomingCalibrations].sort((a, b) => {
    const daysA = differenceInDays(new Date(a.nextCalibrationDate!), now);
    const daysB = differenceInDays(new Date(b.nextCalibrationDate!), now);
    return daysA - daysB;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Controle de Calibração</h1>
        <p className="text-muted-foreground">
          Acompanhe as ferramentas que necessitam calibração periódica
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <span className="material-icons text-destructive text-2xl">error</span>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">
              {overdueCalibrations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas (10 dias)</CardTitle>
            <span className="material-icons text-orange-600 dark:text-orange-500 text-2xl">warning</span>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600 dark:text-orange-500">
              {urgentCalibrations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Vencimento próximo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Dia</CardTitle>
            <span className="material-icons text-green-600 dark:text-green-500 text-2xl">check_circle</span>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600 dark:text-green-500">
              {upcomingCalibrations.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Calibração em dia
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Última Calibração</TableHead>
                <TableHead>Próxima Calibração</TableHead>
                <TableHead>Dias Restantes</TableHead>
                <TableHead>Urgência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <span className="material-icons text-4xl text-muted-foreground mb-2 block">check_circle</span>
                    <p className="text-muted-foreground">Nenhuma ferramenta necessita calibração</p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTools.map((tool) => {
                  const daysRemaining = differenceInDays(new Date(tool.nextCalibrationDate!), now);
                  return (
                    <TableRow key={tool.id} data-testid={`calibration-row-${tool.id}`}>
                      <TableCell>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{tool.code}</code>
                      </TableCell>
                      <TableCell className="font-medium">{tool.name}</TableCell>
                      <TableCell>
                        {tool.lastCalibrationDate
                          ? format(new Date(tool.lastCalibrationDate), "dd/MM/yyyy", { locale: ptBR })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(tool.nextCalibrationDate!), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <span className={daysRemaining < 0 ? "text-destructive font-semibold" : ""}>
                          {daysRemaining < 0 ? `${Math.abs(daysRemaining)} dias atrasado` : `${daysRemaining} dias`}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getUrgencyBadge(daysRemaining)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
