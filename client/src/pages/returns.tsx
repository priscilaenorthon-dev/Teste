import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Loan } from "@shared/schema";

export default function Returns() {
  const { isOperator, isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [returningLoan, setReturningLoan] = useState<Loan | null>(null);

  const { data: loans, isLoading } = useQuery<Loan[]>({
    queryKey: ["/api/loans"],
  });

  const returnMutation = useMutation({
    mutationFn: async (loanId: string) => {
      await apiRequest("PATCH", `/api/loans/${loanId}/return`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Devolução registrada com sucesso!" });
      setReturningLoan(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao registrar devolução",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const activeLoans = loans?.filter((loan) => loan.status === "active") || [];

  const filteredLoans = activeLoans.filter((loan: any) => {
    const userName = `${loan.user?.firstName || ""} ${loan.user?.lastName || ""}`.toLowerCase();
    const toolName = loan.tool?.name?.toLowerCase() || "";
    const toolCode = loan.tool?.code?.toLowerCase() || "";
    return (
      userName.includes(searchTerm.toLowerCase()) ||
      toolName.includes(searchTerm.toLowerCase()) ||
      toolCode.includes(searchTerm.toLowerCase())
    );
  });

  const handleReturn = (loan: Loan) => {
    setReturningLoan(loan);
  };

  const confirmReturn = () => {
    if (returningLoan) {
      returnMutation.mutate(returningLoan.id);
    }
  };

  if (!isOperator && !isAdmin) {
    return (
      <div className="p-6">
        <div className="bg-card border rounded-md p-6">
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para registrar devoluções.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Devoluções</h1>
        <p className="text-muted-foreground">Registre a devolução de ferramentas emprestadas</p>
      </div>

      <div className="flex-1">
        <div className="relative">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            search
          </span>
          <Input
            placeholder="Buscar por usuário, ferramenta ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-returns"
          />
        </div>
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
                <TableHead>Ferramenta</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Data Empréstimo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <span className="material-icons text-4xl text-muted-foreground mb-2 block">check_circle</span>
                    <p className="text-muted-foreground">
                      {activeLoans.length === 0
                        ? "Não há empréstimos ativos"
                        : "Nenhum empréstimo encontrado"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLoans.map((loan: any) => (
                  <TableRow key={loan.id} data-testid={`return-row-${loan.id}`}>
                    <TableCell>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                        {loan.tool?.code || "-"}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{loan.tool?.name || "-"}</TableCell>
                    <TableCell>
                      {loan.user?.firstName} {loan.user?.lastName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{loan.quantityLoaned}</Badge>
                    </TableCell>
                    <TableCell>
                      {loan.loanDate
                        ? format(new Date(loan.loanDate), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleReturn(loan)}
                        data-testid={`button-return-${loan.id}`}
                      >
                        <span className="material-icons text-sm mr-1">assignment_return</span>
                        Registrar Devolução
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!returningLoan} onOpenChange={() => setReturningLoan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Devolução</DialogTitle>
            <DialogDescription>
              Você está prestes a registrar a devolução da ferramenta. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {returningLoan && (
            <div className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-md space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Ferramenta:</span>
                  <span className="text-sm font-medium">{(returningLoan as any).tool?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Código:</span>
                  <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                    {(returningLoan as any).tool?.code}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Usuário:</span>
                  <span className="text-sm font-medium">
                    {(returningLoan as any).user?.firstName} {(returningLoan as any).user?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quantidade:</span>
                  <span className="text-sm font-medium">{returningLoan.quantityLoaned}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Data Empréstimo:</span>
                  <span className="text-sm font-medium">
                    {returningLoan.loanDate
                      ? format(new Date(returningLoan.loanDate), "dd/MM/yyyy HH:mm", { locale: ptBR })
                      : "-"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setReturningLoan(null)}
                  data-testid="button-cancel-return"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmReturn}
                  disabled={returnMutation.isPending}
                  data-testid="button-confirm-return"
                >
                  {returnMutation.isPending ? "Processando..." : "Confirmar Devolução"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
