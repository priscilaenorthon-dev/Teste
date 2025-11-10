import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Tool } from "@shared/schema";

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  const { data: tools, isLoading } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const getStatusBadge = (status: string) => {
    const config = {
      available: { variant: "default" as const, label: "Disponível", icon: "check_circle" },
      loaned: { variant: "secondary" as const, label: "Emprestada", icon: "sync" },
      calibration: { variant: "outline" as const, label: "Em Calibração", icon: "settings" },
      out_of_service: { variant: "destructive" as const, label: "Fora de Uso", icon: "cancel" },
    };
    const statusConfig = config[status as keyof typeof config] || config.available;
    return (
      <Badge variant={statusConfig.variant} className="gap-1">
        <span className="material-icons text-xs">{statusConfig.icon}</span>
        {statusConfig.label}
      </Badge>
    );
  };

  const uniqueClasses = Array.from(new Set(tools?.map(t => (t as any).class?.name).filter(Boolean) || []));

  const filteredTools = tools?.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tool.status === statusFilter;
    const matchesClass = classFilter === "all" || (tool as any).class?.name === classFilter;
    return matchesSearch && matchesStatus && matchesClass;
  }) || [];

  const totalQuantity = filteredTools.reduce((sum, tool) => sum + tool.quantity, 0);
  const availableQuantity = filteredTools.reduce((sum, tool) => sum + tool.availableQuantity, 0);
  const loanedQuantity = totalQuantity - availableQuantity;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Inventário</h1>
        <p className="text-muted-foreground">Visualize todas as ferramentas cadastradas e seus status</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-card border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Quantidade Total</p>
              <p className="text-2xl font-bold">{totalQuantity}</p>
            </div>
            <span className="material-icons text-3xl text-primary">inventory_2</span>
          </div>
        </div>
        
        <div className="bg-card border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-500">{availableQuantity}</p>
            </div>
            <span className="material-icons text-3xl text-green-600 dark:text-green-500">check_circle</span>
          </div>
        </div>
        
        <div className="bg-card border rounded-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Emprestadas</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{loanedQuantity}</p>
            </div>
            <span className="material-icons text-3xl text-orange-600 dark:text-orange-500">input</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              search
            </span>
            <Input
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-inventory"
            />
          </div>
        </div>
        
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-48" data-testid="select-class-filter">
            <SelectValue placeholder="Classe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Classes</SelectItem>
            {uniqueClasses.map((cls) => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter-inventory">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="available">Disponível</SelectItem>
            <SelectItem value="loaned">Emprestada</SelectItem>
            <SelectItem value="calibration">Em Calibração</SelectItem>
            <SelectItem value="out_of_service">Fora de Uso</SelectItem>
          </SelectContent>
        </Select>
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
                <TableHead>Classe</TableHead>
                <TableHead>Modelo</TableHead>
                <TableHead>Qtd Total</TableHead>
                <TableHead>Disponível</TableHead>
                <TableHead>Em Uso</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <span className="material-icons text-4xl text-muted-foreground mb-2 block">inbox</span>
                    <p className="text-muted-foreground">Nenhuma ferramenta encontrada</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTools.map((tool) => {
                  const inUse = tool.quantity - tool.availableQuantity;
                  return (
                    <TableRow key={tool.id} data-testid={`inventory-row-${tool.id}`}>
                      <TableCell>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{tool.code}</code>
                      </TableCell>
                      <TableCell className="font-medium">{tool.name}</TableCell>
                      <TableCell>{(tool as any).class?.name || "-"}</TableCell>
                      <TableCell>{(tool as any).model?.name || "-"}</TableCell>
                      <TableCell>{tool.quantity}</TableCell>
                      <TableCell>
                        <span className="text-green-600 dark:text-green-500 font-medium">
                          {tool.availableQuantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-orange-600 dark:text-orange-500 font-medium">
                          {inUse}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(tool.status)}</TableCell>
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
