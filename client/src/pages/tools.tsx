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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Tool, ToolClass, ToolModel, InsertTool } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const toolFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  code: z.string().min(1, "Código é obrigatório"),
  classId: z.string().min(1, "Classe é obrigatória"),
  modelId: z.string().min(1, "Modelo é obrigatório"),
  quantity: z.number().min(1, "Quantidade deve ser maior que 0"),
  status: z.string(),
  lastCalibrationDate: z.date().optional().nullable(),
});

type ToolFormData = z.infer<typeof toolFormSchema>;

export default function Tools() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);

  const { data: tools, isLoading: loadingTools } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const { data: classes } = useQuery<ToolClass[]>({
    queryKey: ["/api/classes"],
  });

  const { data: models } = useQuery<ToolModel[]>({
    queryKey: ["/api/models"],
  });

  const form = useForm<ToolFormData>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: {
      name: "",
      code: "",
      classId: "",
      modelId: "",
      quantity: 1,
      status: "available",
      lastCalibrationDate: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ToolFormData) => {
      const payload = {
        ...data,
        lastCalibrationDate: data.lastCalibrationDate?.toISOString() || null,
      };
      await apiRequest("POST", "/api/tools", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: "Ferramenta criada com sucesso!" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar ferramenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ToolFormData & { id: string }) => {
      const payload = {
        ...data,
        lastCalibrationDate: data.lastCalibrationDate?.toISOString() || null,
      };
      await apiRequest("PATCH", `/api/tools/${data.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: "Ferramenta atualizada com sucesso!" });
      setOpen(false);
      setEditingTool(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar ferramenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tools/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tools"] });
      toast({ title: "Ferramenta excluída com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir ferramenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ToolFormData) => {
    if (editingTool) {
      updateMutation.mutate({ ...data, id: editingTool.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    form.reset({
      name: tool.name,
      code: tool.code,
      classId: tool.classId || "",
      modelId: tool.modelId || "",
      quantity: tool.quantity,
      status: tool.status,
      lastCalibrationDate: tool.lastCalibrationDate ? new Date(tool.lastCalibrationDate) : null,
    });
    setOpen(true);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEditingTool(null);
      form.reset();
    }
  };

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

  const filteredTools = tools?.filter((tool) => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || tool.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Ferramentas</h1>
          <p className="text-muted-foreground">Gerencie o cadastro de todas as ferramentas</p>
        </div>
        {isAdmin && (
          <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-tool">
                <span className="material-icons text-sm mr-2">add</span>
                Nova Ferramenta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTool ? "Editar Ferramenta" : "Nova Ferramenta"}
                </DialogTitle>
                <DialogDescription>
                  {editingTool ? "Atualize as informações da ferramenta" : "Cadastre uma nova ferramenta no sistema"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-tool-name" placeholder="Ex: Paquímetro Digital" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código *</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-tool-code" placeholder="Ex: PAQ-001" className="font-mono" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="classId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Classe *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tool-class">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {classes?.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="modelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modelo *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tool-model">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {models?.map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              data-testid="input-tool-quantity"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-tool-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Disponível</SelectItem>
                              <SelectItem value="loaned">Emprestada</SelectItem>
                              <SelectItem value="calibration">Em Calibração</SelectItem>
                              <SelectItem value="out_of_service">Fora de Uso</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="lastCalibrationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data da Última Calibração</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="justify-start text-left font-normal"
                                data-testid="button-calibration-date"
                              >
                                <span className="material-icons text-sm mr-2">event</span>
                                {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleOpenChange(false)}
                      data-testid="button-cancel-tool"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-tool"
                    >
                      {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              search
            </span>
            <Input
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-tools"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
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

      {loadingTools ? (
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
                <TableHead>Quantidade</TableHead>
                <TableHead>Disponível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                filteredTools.map((tool) => (
                  <TableRow key={tool.id} data-testid={`tool-row-${tool.id}`}>
                    <TableCell>
                      <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{tool.code}</code>
                    </TableCell>
                    <TableCell className="font-medium">{tool.name}</TableCell>
                    <TableCell>{(tool as any).class?.name || "-"}</TableCell>
                    <TableCell>{(tool as any).model?.name || "-"}</TableCell>
                    <TableCell>{tool.quantity}</TableCell>
                    <TableCell>{tool.availableQuantity}</TableCell>
                    <TableCell>{getStatusBadge(tool.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(tool)}
                              data-testid={`button-edit-${tool.id}`}
                            >
                              <span className="material-icons text-sm">edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm("Tem certeza que deseja excluir esta ferramenta?")) {
                                  deleteMutation.mutate(tool.id);
                                }
                              }}
                              data-testid={`button-delete-${tool.id}`}
                            >
                              <span className="material-icons text-sm">delete</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
