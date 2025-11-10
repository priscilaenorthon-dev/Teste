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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ToolModel, InsertToolModel } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";

const modelFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  requiresCalibration: z.boolean(),
  calibrationIntervalDays: z.number().optional().nullable(),
});

type ModelFormData = z.infer<typeof modelFormSchema>;

export default function Models() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ToolModel | null>(null);

  const { data: models, isLoading } = useQuery<ToolModel[]>({
    queryKey: ["/api/models"],
  });

  const form = useForm<ModelFormData>({
    resolver: zodResolver(modelFormSchema),
    defaultValues: {
      name: "",
      requiresCalibration: false,
      calibrationIntervalDays: null,
    },
  });

  const requiresCalibration = form.watch("requiresCalibration");

  const createMutation = useMutation({
    mutationFn: async (data: ModelFormData) => {
      await apiRequest("POST", "/api/models", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({ title: "Modelo criado com sucesso!" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar modelo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ModelFormData & { id: string }) => {
      await apiRequest("PATCH", `/api/models/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({ title: "Modelo atualizado com sucesso!" });
      setOpen(false);
      setEditingModel(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar modelo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/models/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/models"] });
      toast({ title: "Modelo excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir modelo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ModelFormData) => {
    if (editingModel) {
      updateMutation.mutate({ ...data, id: editingModel.id });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (model: ToolModel) => {
    setEditingModel(model);
    form.reset({
      name: model.name,
      requiresCalibration: model.requiresCalibration,
      calibrationIntervalDays: model.calibrationIntervalDays,
    });
    setOpen(true);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setEditingModel(null);
      form.reset();
    }
  };

  const filteredModels = models?.filter((model) =>
    model.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Modelos de Ferramentas</h1>
          <p className="text-muted-foreground">Gerencie os modelos (Normal ou Calibração)</p>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-model">
              <span className="material-icons text-sm mr-2">add</span>
              Novo Modelo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingModel ? "Editar Modelo" : "Novo Modelo"}
              </DialogTitle>
              <DialogDescription>
                {editingModel ? "Atualize as informações do modelo" : "Cadastre um novo modelo de ferramenta"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-model-name" placeholder="Ex: Normal ou Calibração" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="requiresCalibration"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Requer Calibração</FormLabel>
                        <FormDescription>
                          Este modelo de ferramenta necessita calibração periódica?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-requires-calibration"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {requiresCalibration && (
                  <FormField
                    control={form.control}
                    name="calibrationIntervalDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo de Calibração (dias) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || null)}
                            data-testid="input-calibration-interval"
                            placeholder="Ex: 100, 300"
                          />
                        </FormControl>
                        <FormDescription>
                          Número de dias entre cada calibração
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    data-testid="button-cancel-model"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit-model"
                  >
                    {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1">
        <div className="relative">
          <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            search
          </span>
          <Input
            placeholder="Buscar modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="input-search-models"
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
                <TableHead>Nome</TableHead>
                <TableHead>Requer Calibração</TableHead>
                <TableHead>Intervalo (dias)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <span className="material-icons text-4xl text-muted-foreground mb-2 block">inbox</span>
                    <p className="text-muted-foreground">Nenhum modelo encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredModels.map((model) => (
                  <TableRow key={model.id} data-testid={`model-row-${model.id}`}>
                    <TableCell className="font-medium">{model.name}</TableCell>
                    <TableCell>
                      {model.requiresCalibration ? (
                        <Badge variant="default" className="gap-1">
                          <span className="material-icons text-xs">check_circle</span>
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <span className="material-icons text-xs">cancel</span>
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {model.calibrationIntervalDays ? `${model.calibrationIntervalDays} dias` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(model)}
                          data-testid={`button-edit-${model.id}`}
                        >
                          <span className="material-icons text-sm">edit</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Tem certeza que deseja excluir este modelo?")) {
                              deleteMutation.mutate(model.id);
                            }
                          }}
                          data-testid={`button-delete-${model.id}`}
                        >
                          <span className="material-icons text-sm">delete</span>
                        </Button>
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
