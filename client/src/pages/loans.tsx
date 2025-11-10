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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tool, User } from "@shared/schema";

type SelectedTool = {
  toolId: string;
  quantityLoaned: number;
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

  const { data: tools } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const createLoanMutation = useMutation({
    mutationFn: async (data: { 
      tools: { toolId: string; quantityLoaned: number }[]; 
      userId: string; 
      userConfirmation: { email: string; password: string } 
    }) => {
      await apiRequest("POST", "/api/loans", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ 
        title: "Empréstimos registrados com sucesso!",
        description: "O Termo de Cautela foi gerado automaticamente."
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

    setSelectedTools([...selectedTools, { toolId: currentTool, quantityLoaned: currentQuantity }]);
    setCurrentTool("");
    setCurrentQuantity(1);
  };

  const handleRemoveTool = (toolId: string) => {
    setSelectedTools(selectedTools.filter(t => t.toolId !== toolId));
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

  const handleConfirm = () => {
    if (!userEmail || !userPassword) {
      toast({
        title: "Confirmação necessária",
        description: "O usuário deve confirmar com email e senha",
        variant: "destructive",
      });
      return;
    }
    
    createLoanMutation.mutate({
      tools: selectedTools,
      userId: selectedUser,
      userConfirmation: {
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
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono">{tool.code}</code>
                                <span>{tool.name}</span>
                                <Badge variant="secondary" className="ml-2">
                                  Disp: {tool.availableQuantity}
                                </Badge>
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
                            <div className="flex items-center gap-3">
                              <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                                {tool?.code}
                              </code>
                              <div>
                                <p className="text-sm font-medium">{tool?.name}</p>
                                <p className="text-xs text-muted-foreground">Quantidade: {st.quantityLoaned}</p>
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
                            <div key={st.toolId} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                              <div className="flex items-center gap-2">
                                <code className="text-xs font-mono bg-background px-2 py-0.5 rounded">
                                  {tool?.code}
                                </code>
                                <span>{tool?.name}</span>
                              </div>
                              <Badge variant="secondary">Qtd: {st.quantityLoaned}</Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Separator />

                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-md">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="material-icons text-sm text-primary">info</span>
                      Confirmação do Usuário
                    </p>
                    <p className="text-xs text-muted-foreground">
                      O usuário deve confirmar o recebimento das ferramentas utilizando seu email e senha cadastrados no sistema.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userEmail">Email do Usuário *</Label>
                    <Input
                      id="userEmail"
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="usuario@exemplo.com"
                      data-testid="input-user-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="userPassword">Senha do Usuário *</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="••••••••"
                      data-testid="input-user-password"
                    />
                  </div>
                </div>

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
                    disabled={createLoanMutation.isPending}
                    data-testid="button-confirm-loan"
                  >
                    {createLoanMutation.isPending ? "Confirmando..." : "Confirmar Empréstimo"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
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
