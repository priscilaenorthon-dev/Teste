import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

export default function Reports() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("loaned");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const departments = Array.from(
    new Set(
      (users?.map((u) => u.department).filter((dept): dept is string => typeof dept === "string" && dept.length > 0) ?? [])
    )
  );

  const { data: loans } = useQuery({
    queryKey: ["/api/loans"],
    enabled: false,
  });

  const { data: tools } = useQuery({
    queryKey: ["/api/tools"],
    enabled: false,
  });

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Datas obrigatórias",
        description: "Selecione o período para o relatório",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch data based on report type
      let doc;
      const fileName = `relatorio_${reportType}_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.pdf`;

      switch (reportType) {
        case 'loaned': {
          const response = await fetch('/api/loans');
          const allLoans = await response.json();
          const activeLoans = allLoans.filter((loan: any) => loan.status === 'active');
          const { generateLoanedToolsReport } = await import('@/lib/pdfGenerator');
          const loanData = activeLoans.map((loan: any) => ({
            toolCode: loan.tool?.code || '',
            toolName: loan.tool?.name || '',
            userName: `${loan.user?.firstName || ''} ${loan.user?.lastName || ''}`.trim(),
            loanDate: loan.loanDate,
            status: loan.status,
          }));
          doc = generateLoanedToolsReport(loanData, startDate, endDate);
          break;
        }

        case 'history': {
          const response = await fetch('/api/loans');
          const allLoans = await response.json();
          const filteredLoans = allLoans.filter((loan: any) => {
            const loanDate = new Date(loan.loanDate);
            return loanDate >= startDate && loanDate <= endDate;
          });
          const { generateLoanHistoryReport } = await import('@/lib/pdfGenerator');
          const loanData = filteredLoans.map((loan: any) => ({
            toolCode: loan.tool?.code || '',
            toolName: loan.tool?.name || '',
            userName: `${loan.user?.firstName || ''} ${loan.user?.lastName || ''}`.trim(),
            loanDate: loan.loanDate,
            returnDate: loan.returnDate,
            status: loan.status,
          }));
          doc = generateLoanHistoryReport(loanData, startDate, endDate);
          break;
        }

        case 'calibration': {
          const response = await fetch('/api/tools');
          const allTools = await response.json();
          const calibrationTools = allTools.filter((tool: any) => 
            tool.model?.requiresCalibration && tool.nextCalibrationDate
          ).map((tool: any) => ({
            toolCode: tool.code,
            toolName: tool.name,
            lastCalibrationDate: tool.lastCalibrationDate,
            nextCalibrationDate: tool.nextCalibrationDate,
            daysRemaining: Math.floor((new Date(tool.nextCalibrationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
          }));
          const { generateCalibrationReport } = await import('@/lib/pdfGenerator');
          doc = generateCalibrationReport(calibrationTools);
          break;
        }

        case 'inventory': {
          const response = await fetch('/api/tools');
          const allTools = await response.json();
          const inventoryData = allTools.map((tool: any) => ({
            toolCode: tool.code,
            toolName: tool.name,
            class: tool.class?.name || '',
            model: tool.model?.name || '',
            totalQuantity: tool.quantity,
            availableQuantity: tool.availableQuantity,
            status: tool.status,
          }));
          const { generateInventoryReport } = await import('@/lib/pdfGenerator');
          doc = generateInventoryReport(inventoryData);
          break;
        }
      }

      if (doc) {
        doc.save(fileName);
        toast({
          title: "Relatório gerado com sucesso!",
          description: `Download iniciado: ${fileName}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Relatórios</h1>
        <p className="text-muted-foreground">Gere relatórios detalhados em PDF</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Configurar Relatório</CardTitle>
            <CardDescription>
              Selecione os filtros desejados e gere o relatório em PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="loaned">Ferramentas Emprestadas</SelectItem>
                  <SelectItem value="history">Histórico de Empréstimos</SelectItem>
                  <SelectItem value="calibration">Agenda de Calibração</SelectItem>
                  <SelectItem value="inventory">Inventário Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-start-date"
                    >
                      <span className="material-icons text-sm mr-2">event</span>
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                      data-testid="button-end-date"
                    >
                      <span className="material-icons text-sm mr-2">event</span>
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger data-testid="select-user-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Usuários</SelectItem>
                    {users?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger data-testid="select-department-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Setores</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleGenerateReport}
                className="w-full"
                data-testid="button-generate-report"
              >
                <span className="material-icons text-sm mr-2">picture_as_pdf</span>
                Gerar Relatório em PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tipos de Relatórios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <span className="material-icons text-sm text-primary mt-0.5">description</span>
                <div>
                  <p className="text-sm font-medium">Ferramentas Emprestadas</p>
                  <p className="text-xs text-muted-foreground">
                    Lista de ferramentas atualmente emprestadas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="material-icons text-sm text-primary mt-0.5">history</span>
                <div>
                  <p className="text-sm font-medium">Histórico de Empréstimos</p>
                  <p className="text-xs text-muted-foreground">
                    Todas as movimentações no período
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="material-icons text-sm text-primary mt-0.5">event</span>
                <div>
                  <p className="text-sm font-medium">Agenda de Calibração</p>
                  <p className="text-xs text-muted-foreground">
                    Próximas calibrações agendadas
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <span className="material-icons text-sm text-primary mt-0.5">inventory_2</span>
                <div>
                  <p className="text-sm font-medium">Inventário Geral</p>
                  <p className="text-xs text-muted-foreground">
                    Relatório completo do inventário
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formato do Relatório</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md">
                <span className="material-icons text-3xl text-destructive">picture_as_pdf</span>
                <div>
                  <p className="text-sm font-medium">PDF</p>
                  <p className="text-xs text-muted-foreground">
                    Formato padrão para impressão
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
