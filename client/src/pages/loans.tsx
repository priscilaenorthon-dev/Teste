import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { Loan, Tool, User } from "@shared/schema";
import { generateLoanTermPDF } from "@/lib/generateLoanPDF";
import { QRScanner } from "@/components/QRScanner";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

type SelectedTool = {
  toolId: string;
  quantityLoaned: number;
};

type LoanWithRelations = Loan & {
  tool?: Tool | null;
  user?: User | null;
  operator?: User | null;
};

const loanStatusConfig: Record<
  string,
  { label: string; className: string; icon: string; description: string }
> = {
  active: {
    label: "Em andamento",
    className:
      "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    icon: "play_circle",
    description: "Ferramenta em uso pelo colaborador",
  },
  overdue: {
    label: "Em atraso",
    className:
      "border-destructive/30 bg-destructive/10 text-destructive",
    icon: "error",
    description: "Prazo vencido, priorizar contato com o usuário",
  },
  returned: {
    label: "Devolvido",
    className:
      "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: "task_alt",
    description: "Ferramenta já foi devolvida",
  },
};

const toolStatusConfig: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  available: {
    label: "Disponível",
    className:
      "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: "inventory_2",
  },
  loaned: {
    label: "Emprestado",
    className:
      "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    icon: "assignment_return",
  },
  calibration: {
    label: "Em calibração",
    className:
      "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    icon: "tune",
  },
  out_of_service: {
    label: "Indisponível",
    className:
      "border-destructive/30 bg-destructive/10 text-destructive",
    icon: "block",
  },
};

const painPoints = [
  {
    title: "Excesso de cliques para concluir o empréstimo",
    detail: "Operadores relatam precisar de até 6 interações entre abas e botões para finalizar um registro simples.",
    metric: "6 cliques médios",
    severity: "high" as const,
  },
  {
    title: "Mensagens de validação pouco claras",
    detail: "Quando campos obrigatórios ficam vazios, o sistema apenas apresenta um toast genérico, sem apontar onde corrigir.",
    metric: "3 ocorrências/turno",
    severity: "medium" as const,
  },
  {
    title: "Confirmação duplicada com usuário",
    detail: "Após inserir credenciais, operadores costumam voltar à etapa 1 para conferir se as ferramentas continuam selecionadas.",
    metric: "+40s adicionais",
    severity: "medium" as const,
  },
];

const severityBadgeStyles: Record<
  "high" | "medium" | "low",
  { className: string; label: string; icon: string }
> = {
  high: {
    className:
      "border-destructive/40 bg-destructive/15 text-destructive",
    label: "Impacto alto",
    icon: "priority_high",
  },
  medium: {
    className:
      "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
    label: "Impacto médio",
    icon: "warning",
  },
  low: {
    className:
      "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
    label: "Impacto baixo",
    icon: "info",
  },
};

const renderStatusBadge = (status: string, configMap: typeof loanStatusConfig | typeof toolStatusConfig) => {
  const config = configMap[status] || Object.values(configMap)[0];
  return (
    <Badge className={cn("border", config.className)}>
      <span className="flex items-center gap-1">
        <span className="material-icons text-[14px] leading-none">{config.icon}</span>
        {config.label}
      </span>
    </Badge>
  );
};

const renderCalibrationBadge = (tool?: Tool | null) => {
  if (!tool) return null;

  if (!tool.nextCalibrationDate) {
    return (
      <Badge className="border-muted bg-muted text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="material-icons text-[14px] leading-none">event_busy</span>
          Sem calibração prevista
        </span>
      </Badge>
    );
  }

  const daysUntil = differenceInDays(new Date(tool.nextCalibrationDate), new Date());
  let className = "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300";
  let icon = "event_available";
  if (daysUntil < 0) {
    className = "border-destructive/40 bg-destructive/15 text-destructive";
    icon = "event_busy";
  } else if (daysUntil <= 7) {
    className = "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
    icon = "upcoming";
  } else if (daysUntil <= 14) {
    className = "border-yellow-200 bg-yellow-100 text-yellow-700 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-300";
    icon = "schedule";
  }

  return (
    <Badge className={cn("border", className)}>
      <span className="flex items-center gap-1">
        <span className="material-icons text-[14px] leading-none">{icon}</span>
        Próx. calibração: {format(new Date(tool.nextCalibrationDate), "dd/MM", { locale: ptBR })}
      </span>
    </Badge>
  );
};

const renderAvailabilityBadge = (tool?: Tool | null) => {
  if (!tool) return null;
  const className =
    tool.availableQuantity > 0
      ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      : "border-destructive/40 bg-destructive/15 text-destructive";

  return (
    <Badge className={cn("border", className)}>
      <span className="flex items-center gap-1">
        <span className="material-icons text-[14px] leading-none">inventory</span>
        Disponíveis: {tool.availableQuantity}/{tool.quantity}
      </span>
    </Badge>
  );
};

const formatDateTime = (value?: string | Date | null) => {
  if (!value) return null;
  try {
    return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch (error) {
    return null;
  }
};

const renderConfirmationBadge = (loan: LoanWithRelations) => {
  const isConfirmed = Boolean(loan.userConfirmation);
  const className = isConfirmed
    ? "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300";
  const icon = isConfirmed ? "verified_user" : "pending_actions";
  const label = isConfirmed ? "Usuário confirmou" : "Confirmação pendente";

  return (
    <Badge className={cn("border", className)}>
      <span className="flex items-center gap-1">
        <span className="material-icons text-[14px] leading-none">{icon}</span>
        {label}
      </span>
    </Badge>
  );
};

export default function Loans() {
  const { user, isOperator } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTools, setSelectedTools] = useState<SelectedTool[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [currentTool, setCurrentTool] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [authMethod, setAuthMethod] = useState<"manual" | "qrcode">("manual");
  const [isScanning, setIsScanning] = useState(false);
  const [qrValidatedUser, setQrValidatedUser] = useState<User | null>(null);

  const { data: tools } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: loans, isLoading: isLoadingLoans } = useQuery<LoanWithRelations[]>({
    queryKey: ["/api/loans"],
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data: { 
      tools: { toolId: string; quantityLoaned: number }[]; 
      userId: string; 
      userConfirmation: 
        | { method: "manual"; email: string; password: string }
        | { method: "qrcode"; qrCode: string }
    }) => {
      const response = await apiRequest("POST", "/api/loans", data);
      return await response.json();
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      // Generate PDF with loan details
      if (response?.batchId && selectedUserData && user && tools) {
        const loanTools = selectedTools.map(st => {
          const tool = tools.find(t => t.id === st.toolId);
          if (!tool) {
            console.error(`Tool not found for ID: ${st.toolId}`);
            return null;
          }
          return {
            tool,
            quantityLoaned: st.quantityLoaned
          };
        }).filter((item): item is { tool: Tool; quantityLoaned: number } => item !== null);
        
        if (loanTools.length === selectedTools.length) {
          generateLoanTermPDF(selectedUserData, user, loanTools, response.batchId);
        } else {
          console.error("Some tools could not be found for PDF generation");
        }
      }
      
      toast({ 
        title: "Empréstimos registrados com sucesso!",
        description: "O Termo de Responsabilidade foi gerado e baixado automaticamente."
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar empréstimos",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const availableTools = tools?.filter(t => t.availableQuantity > 0) || [];
  const currentToolData = tools?.find(t => t.id === currentTool);
  const selectedUserData = users?.find(u => u.id === selectedUser);
  const loanList = loans || [];
  const loanStatusTotals = loanList.reduce<Record<string, number>>((acc, loan) => {
    const key = loan.status || "active";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const isLoanOverdue = (loan: LoanWithRelations) => {
    if (loan.status === "returned") return false;
    if (!loan.expectedReturnDate) return false;
    return new Date(loan.expectedReturnDate) < new Date();
  };

  const handleClose = () => {
    setOpen(false);
    setStep(1);
    setSelectedTools([]);
    setSelectedUser("");
    setCurrentTool("");
    setCurrentQuantity(1);
    setUserEmail("");
    setUserPassword("");
  };

  const handleAddTool = () => {
    if (!currentTool || currentQuantity < 1) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione a ferramenta e quantidade",
        variant: "destructive",
      });
      return;
    }

    const toolExists = selectedTools.find(t => t.toolId === currentTool);
    if (toolExists) {
      toast({
        title: "Ferramenta já adicionada",
        description: "Esta ferramenta já está na lista",
        variant: "destructive",
      });
      return;
    }

    const toolData = tools?.find(t => t.id === currentTool);
    setSelectedTools([...selectedTools, { toolId: currentTool, quantityLoaned: currentQuantity }]);
    setCurrentTool("");
    setCurrentQuantity(1);

    toast({
      title: "Ferramenta adicionada",
      description: toolData
        ? `${toolData.name} incluída na solicitação.`
        : "Ferramenta incluída na solicitação.",
    });
  };

  const handleRemoveTool = (toolId: string) => {
    const toolData = tools?.find(t => t.id === toolId);
    setSelectedTools(selectedTools.filter(t => t.toolId !== toolId));

    toast({
      title: "Ferramenta removida",
      description: toolData
        ? `${toolData.name} retirada da solicitação.`
        : "Ferramenta removida da solicitação.",
    });
  };

  const handleStepOne = () => {
    if (selectedTools.length === 0) {
      toast({
        title: "Nenhuma ferramenta selecionada",
        description: "Adicione pelo menos uma ferramenta",
        variant: "destructive",
      });
      return;
    }

    if (!selectedUser) {
      toast({
        title: "Usuário não selecionado",
        description: "Selecione o usuário que receberá as ferramentas",
        variant: "destructive",
      });
      return;
    }
    
    setStep(2);
  };

  const handleQRScan = async (qrCode: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/validate-qrcode", { qrCode });
      const userData = await response.json();
      
      setQrValidatedUser(userData);
      setIsScanning(false);
      
      // CRITICAL: Verify that the scanned QR code belongs to the selected user
      if (userData.id !== selectedUser) {
        toast({
          title: "QR Code não corresponde",
          description: `Este QR Code pertence a ${userData.firstName} ${userData.lastName}, mas o empréstimo é para ${selectedUserData?.firstName} ${selectedUserData?.lastName}. Por favor, o usuário correto deve confirmar.`,
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "QR Code validado",
        description: `Usuário ${userData.firstName} ${userData.lastName} confirmado`,
      });
      
      // Auto-confirm the loan with QR code authentication
      createLoanMutation.mutate({
        tools: selectedTools,
        userId: selectedUser,
        userConfirmation: {
          method: "qrcode",
          qrCode: qrCode, // Send actual QR code for server-side validation
        },
      });
    } catch (error: any) {
      toast({
        title: "QR Code inválido",
        description: "Não foi possível validar o QR Code. Tente novamente.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const handleConfirm = () => {
    if (authMethod === "qrcode") {
      setIsScanning(true);
      return;
    }
    
    if (!userEmail || !userPassword) {
      toast({
        title: "Confirmação necessária",
        description: "O usuário deve confirmar com login e senha",
        variant: "destructive",
      });
      return;
    }
    
    createLoanMutation.mutate({
      tools: selectedTools,
      userId: selectedUser,
      userConfirmation: {
        method: "manual",
        email: userEmail,
        password: userPassword,
      },
    });
  };

  if (!isOperator) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Restrito</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Empréstimos</h1>
          <p className="text-muted-foreground">Registre empréstimos de ferramentas</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-loan">
              <span className="material-icons text-sm mr-2">add</span>
              Novo Empréstimo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {step === 1 ? "Registrar Empréstimo - Etapa 1" : "Confirmar Recebimento - Etapa 2"}
              </DialogTitle>
              <DialogDescription>
                {step === 1 
                  ? "Selecione as ferramentas e o usuário que irá pegá-las"
                  : "O usuário deve confirmar o recebimento das ferramentas"}
              </DialogDescription>
            </DialogHeader>

            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="user">Usuário *</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger data-testid="select-loan-user">
                      <SelectValue placeholder="Selecione o usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex flex-col">
                            <span>{u.firstName} {u.lastName}</span>
                            {u.department && (
                              <span className="text-xs text-muted-foreground">{u.department}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Adicionar Ferramentas</Label>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-2">
                      <Select value={currentTool} onValueChange={setCurrentTool}>
                        <SelectTrigger data-testid="select-loan-tool">
                          <SelectValue placeholder="Selecione a ferramenta" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTools.map((tool) => (
                            <SelectItem key={tool.id} value={tool.id}>
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <code className="text-xs font-mono">{tool.code}</code>
                                  <span className="font-medium">{tool.name}</span>
                                  {renderStatusBadge(tool.status, toolStatusConfig)}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {renderAvailabilityBadge(tool)}
                                  {renderCalibrationBadge(tool)}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24 space-y-2">
                      <Input
                        type="number"
                        min="1"
                        max={currentToolData?.availableQuantity || 1}
                        value={currentQuantity}
                        onChange={(e) => setCurrentQuantity(parseInt(e.target.value) || 1)}
                        placeholder="Qtd"
                        data-testid="input-loan-quantity"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleAddTool}
                      disabled={!currentTool}
                      data-testid="button-add-tool"
                    >
                      <span className="material-icons text-sm">add</span>
                    </Button>
                  </div>
                </div>

                {selectedTools.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Ferramentas Selecionadas ({selectedTools.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {selectedTools.map((st) => {
                        const tool = tools?.find(t => t.id === st.toolId);
                        return (
                          <div
                            key={st.toolId}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                            data-testid={`selected-tool-${st.toolId}`}
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-3">
                                <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                                  {tool?.code}
                                </code>
                                <div>
                                  <p className="text-sm font-medium">{tool?.name}</p>
                                  <p className="text-xs text-muted-foreground">Quantidade: {st.quantityLoaned}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {tool?.status && renderStatusBadge(tool.status, toolStatusConfig)}
                                {renderAvailabilityBadge(tool)}
                                {renderCalibrationBadge(tool)}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveTool(st.toolId)}
                              data-testid={`button-remove-tool-${st.toolId}`}
                            >
                              <span className="material-icons text-sm">close</span>
                            </Button>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    data-testid="button-cancel-loan"
                  >
                    Cancelar
                  </Button>
                  <Button onClick={handleStepOne} data-testid="button-next-step">
                    Próximo
                    <span className="material-icons text-sm ml-2">arrow_forward</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Resumo do Empréstimo</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Usuário:</p>
                        <p className="font-medium">
                          {selectedUserData?.firstName} {selectedUserData?.lastName}
                        </p>
                        {selectedUserData?.department && (
                          <p className="text-xs text-muted-foreground">{selectedUserData.department}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">Operador:</p>
                        <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <p className="text-sm font-medium mb-2">Ferramentas ({selectedTools.length}):</p>
                      <div className="space-y-2">
                        {selectedTools.map((st) => {
                          const tool = tools?.find(t => t.id === st.toolId);
                          return (
                            <div key={st.toolId} className="flex flex-col gap-2 text-sm p-3 rounded bg-muted/30">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                                    {tool?.code}
                                  </code>
                                  <span className="font-medium">{tool?.name}</span>
                                </div>
                                <Badge variant="secondary">Qtd: {st.quantityLoaned}</Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {tool?.status && renderStatusBadge(tool.status, toolStatusConfig)}
                                {renderAvailabilityBadge(tool)}
                                {renderCalibrationBadge(tool)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                {isScanning ? (
                  <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setIsScanning(false)}
                  />
                ) : (
                  <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as "manual" | "qrcode")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual" data-testid="tab-manual-auth">
                        <span className="material-icons text-sm mr-2">login</span>
                        Login/Senha
                      </TabsTrigger>
                      <TabsTrigger value="qrcode" data-testid="tab-qrcode-auth">
                        <span className="material-icons text-sm mr-2">qr_code_scanner</span>
                        QR Code
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 mt-4">
                      <div className="bg-muted/50 p-4 rounded-md">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <span className="material-icons text-sm text-primary">info</span>
                          Confirmação do Usuário
                        </p>
                        <p className="text-xs text-muted-foreground">
                          O usuário deve confirmar o recebimento das ferramentas utilizando seu login e senha cadastrados no sistema.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="userEmail">Login *</Label>
                        <Input
                          id="userEmail"
                          type="text"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          placeholder="Digite seu login"
                          data-testid="input-user-email"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="userPassword">Senha *</Label>
                        <Input
                          id="userPassword"
                          type="password"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="••••••••"
                          data-testid="input-user-password"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="qrcode" className="space-y-4 mt-4">
                      <div className="bg-muted/50 p-4 rounded-md">
                        <p className="text-sm font-medium mb-2 flex items-center gap-2">
                          <span className="material-icons text-sm text-primary">qr_code_scanner</span>
                          Autenticação por QR Code
                        </p>
                        <p className="text-xs text-muted-foreground">
                          O usuário deve escanear o QR Code do crachá para confirmar o recebimento das ferramentas.
                        </p>
                      </div>

                      <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
                          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="material-icons text-5xl text-primary">qr_code_scanner</span>
                          </div>
                          <div className="space-y-2">
                            <p className="font-medium">Pronto para escanear</p>
                            <p className="text-sm text-muted-foreground">
                              Clique em "Escanear QR Code" para abrir a câmera e ler o código do crachá
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                )}

                <DialogFooter className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                    data-testid="button-back"
                  >
                    <span className="material-icons text-sm mr-2">arrow_back</span>
                    Voltar
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={createLoanMutation.isPending || isScanning}
                    data-testid="button-confirm-loan"
                  >
                    {createLoanMutation.isPending ? (
                      "Confirmando..."
                    ) : authMethod === "qrcode" ? (
                      <>
                        <span className="material-icons text-sm mr-2">qr_code_scanner</span>
                        Escanear QR Code
                      </>
                    ) : (
                      "Confirmar Empréstimo"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Status dos empréstimos</CardTitle>
            <CardDescription>Visão rápida das entregas e pendências com feedback visual imediato.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLoans ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-24 w-full" />
                ))}
              </div>
            ) : loanList.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                <span className="material-icons text-3xl text-muted-foreground/80">inventory_2</span>
                Nenhum empréstimo registrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {loanList.slice(0, 8).map((loan) => {
                  const statusKey = isLoanOverdue(loan) ? "overdue" : loan.status;
                  const loanDateFormatted = formatDateTime(loan.loanDate);
                  const returnDateFormatted = loan.returnDate ? formatDateTime(loan.returnDate) : null;
                  const expectedReturnFormatted = loan.expectedReturnDate
                    ? format(new Date(loan.expectedReturnDate), "dd/MM/yyyy", { locale: ptBR })
                    : null;
                  const dueLabel = returnDateFormatted
                    ? `Devolvido em ${returnDateFormatted}`
                    : expectedReturnFormatted
                      ? `Devolver até ${expectedReturnFormatted}`
                      : "Devolução sem previsão";
                  const dueClassName = returnDateFormatted
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isLoanOverdue(loan)
                      ? "text-destructive font-semibold"
                      : "text-muted-foreground";

                  return (
                    <div
                      key={loan.id}
                      className={cn(
                        "rounded-md border p-4 transition-colors",
                        isLoanOverdue(loan) && !returnDateFormatted
                          ? "border-destructive/50 bg-destructive/5"
                          : "border-border bg-background/40 dark:bg-background/60"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">{loan.tool?.name || "Ferramenta sem nome"}</span>
                          {renderStatusBadge(statusKey, loanStatusConfig)}
                          {!returnDateFormatted && isLoanOverdue(loan) && loan.status !== "overdue" && (
                            <Badge className="border-destructive/40 bg-destructive/15 text-destructive">
                              <span className="flex items-center gap-1">
                                <span className="material-icons text-[14px] leading-none">new_releases</span>
                                Prazo vencido
                              </span>
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{loan.tool?.code || "—"}</span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-[14px] leading-none">person</span>
                          {loan.user
                            ? `${loan.user.firstName || ""} ${loan.user.lastName || ""}`.trim()
                            : "Usuário não identificado"}
                        </span>
                        {loanDateFormatted && (
                          <span className="flex items-center gap-1">
                            <span className="material-icons text-[14px] leading-none">schedule</span>
                            Emprestado em {loanDateFormatted}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <span className={cn("text-xs", dueClassName)}>{dueLabel}</span>
                        {renderConfirmationBadge(loan)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Panorama de status</CardTitle>
              <CardDescription>Acompanhe quantos empréstimos estão em cada situação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(loanStatusConfig).map(([key, config]) => (
                <div
                  key={key}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div className="space-y-1">
                    {renderStatusBadge(key, loanStatusConfig)}
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </div>
                  <span className="text-2xl font-bold leading-none">{loanStatusTotals[key] || 0}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pontos de atrito mapeados</CardTitle>
              <CardDescription>Insights coletados com operadores durante as últimas rotinas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {painPoints.map((point) => {
                const severity = severityBadgeStyles[point.severity];
                return (
                  <div key={point.title} className="space-y-2 rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight">{point.title}</p>
                      <Badge className={cn("border", severity.className)}>
                        <span className="flex items-center gap-1">
                          <span className="material-icons text-[14px] leading-none">{severity.icon}</span>
                          {severity.label}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">{point.detail}</p>
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <span className="material-icons text-[14px] leading-none">mouse</span>
                      {point.metric}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona o processo de empréstimo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Seleção de Ferramentas e Usuário</h4>
                  <p className="text-sm text-muted-foreground">
                    O operador seleciona quais ferramentas serão emprestadas e para qual usuário.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Confirmação do Usuário</h4>
                  <p className="text-sm text-muted-foreground">
                    O usuário confirma o recebimento fazendo login com email e senha.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Geração do Termo de Cautela</h4>
                  <p className="text-sm text-muted-foreground">
                    O sistema gera automaticamente um termo digital com todos os detalhes.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">4</span>
                </div>
                <div>
                  <h4 className="font-medium mb-1">Atualização do Inventário</h4>
                  <p className="text-sm text-muted-foreground">
                    As ferramentas são marcadas como emprestadas e o inventário é atualizado.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
