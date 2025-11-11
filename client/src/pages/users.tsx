import { useState, useEffect, useRef } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import QRCode from "qrcode";

const userEditFormSchema = z.object({
  matriculation: z.string().min(1, "Matrícula é obrigatória"),
  department: z.string().min(1, "Setor é obrigatório"),
  role: z.enum(["user", "operator", "admin"]),
});

const userCreateFormSchema = z.object({
  username: z.string().min(3, "Username deve ter no mínimo 3 caracteres"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  matriculation: z.string().min(1, "Matrícula é obrigatória"),
  department: z.string().min(1, "Setor é obrigatório"),
  role: z.enum(["user", "operator", "admin"]),
});

type UserEditFormData = z.infer<typeof userEditFormSchema>;
type UserCreateFormData = z.infer<typeof userCreateFormSchema>;

export default function Users() {
  const { isAdmin, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedUserForQR, setSelectedUserForQR] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const editForm = useForm<UserEditFormData>({
    resolver: zodResolver(userEditFormSchema),
    defaultValues: {
      matriculation: "",
      department: "",
      role: "user",
    },
  });

  const createForm = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateFormSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      matriculation: "",
      department: "",
      role: "user",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: UserEditFormData & { id: string }) => {
      await apiRequest("PATCH", `/api/users/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário atualizado com sucesso!" });
      setEditDialogOpen(false);
      setEditingUser(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserCreateFormData) => {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar usuário');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário criado com sucesso!" });
      setCreateDialogOpen(false);
      createForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/users/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Usuário excluído com sucesso!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onEditSubmit = (data: UserEditFormData) => {
    if (editingUser) {
      updateMutation.mutate({ ...data, id: editingUser.id });
    }
  };

  const onCreateSubmit = (data: UserCreateFormData) => {
    createMutation.mutate(data);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    editForm.reset({
      matriculation: user.matriculation || "",
      department: user.department || "",
      role: (user.role || "user") as "user" | "operator" | "admin",
    });
    setEditDialogOpen(true);
  };

  const handleEditDialogChange = (newOpen: boolean) => {
    setEditDialogOpen(newOpen);
    if (!newOpen) {
      setEditingUser(null);
      editForm.reset();
    }
  };

  const handleCreateDialogChange = (newOpen: boolean) => {
    setCreateDialogOpen(newOpen);
    if (!newOpen) {
      createForm.reset();
    }
  };

  const getRoleBadge = (role: string) => {
    const config = {
      admin: { variant: "default" as const, label: "Administrador" },
      operator: { variant: "secondary" as const, label: "Operador" },
      user: { variant: "outline" as const, label: "Usuário" },
    };
    const roleConfig = config[role as keyof typeof config] || config.user;
    return <Badge variant={roleConfig.variant}>{roleConfig.label}</Badge>;
  };

  const filteredUsers = users?.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.matriculation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

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
          <h1 className="text-3xl font-bold mb-2">Usuários</h1>
          <p className="text-muted-foreground">Gerencie os usuários do sistema</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={handleCreateDialogChange}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <span className="material-icons text-sm mr-2">add</span>
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário no sistema
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={createForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-create-username" placeholder="Ex: joao.silva" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha *</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-create-password" placeholder="Mínimo 6 caracteres" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-create-firstname" placeholder="Ex: João" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sobrenome *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-create-lastname" placeholder="Ex: Silva" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-create-email" type="email" placeholder="joao.silva@empresa.com" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="matriculation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Matrícula *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-create-matriculation" placeholder="Ex: EMP001" className="font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Setor *</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-create-department" placeholder="Ex: Produção" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Perfil *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-create-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="operator">Operador</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleCreateDialogChange(false)}
                    data-testid="button-cancel-create"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                    data-testid="button-submit-create"
                  >
                    {createMutation.isPending ? "Criando..." : "Criar Usuário"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              search
            </span>
            <Input
              placeholder="Buscar por nome, email ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-users"
            />
          </div>
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48" data-testid="select-role-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Perfis</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="operator">Operador</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
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
                <TableHead>Usuário</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-center">QR Code</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <span className="material-icons text-4xl text-muted-foreground mb-2 block">inbox</span>
                    <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => {
                  const initials = user.firstName && user.lastName
                    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                    : user.email?.[0]?.toUpperCase() || "U";

                  const isCurrentUser = currentUser?.id === user.id;
                  const isDeleting = deleteMutation.isPending && deleteMutation.variables === user.id;
                  const disableDelete = isCurrentUser || isDeleting;

                  return (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{user.firstName} {user.lastName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        {user.matriculation ? (
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {user.matriculation}
                          </code>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{user.department || "-"}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="text-center">
                        {user.qrCode ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedUserForQR(user);
                              setQrDialogOpen(true);
                            }}
                            data-testid={`button-view-qr-${user.id}`}
                          >
                            <span className="material-icons text-sm">qr_code_2</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={editDialogOpen && editingUser?.id === user.id} onOpenChange={handleEditDialogChange}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(user)}
                                data-testid={`button-edit-${user.id}`}
                              >
                                <span className="material-icons text-sm">edit</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Editar Usuário</DialogTitle>
                                <DialogDescription>
                                  Atualize as informações do usuário
                                </DialogDescription>
                              </DialogHeader>
                              <Form {...editForm}>
                                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                                  <FormField
                                    control={editForm.control}
                                    name="matriculation"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Matrícula *</FormLabel>
                                        <FormControl>
                                          <Input {...field} data-testid="input-user-matriculation" placeholder="Ex: EMP001" className="font-mono" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={editForm.control}
                                    name="department"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Setor *</FormLabel>
                                        <FormControl>
                                          <Input {...field} data-testid="input-user-department" placeholder="Ex: Produção" />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={editForm.control}
                                    name="role"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Perfil *</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                          <FormControl>
                                            <SelectTrigger data-testid="select-user-role">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="user">Usuário</SelectItem>
                                            <SelectItem value="operator">Operador</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <div className="flex justify-end gap-3 pt-4">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => handleEditDialogChange(false)}
                                      data-testid="button-cancel-user"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      type="submit"
                                      disabled={updateMutation.isPending}
                                      data-testid="button-submit-user"
                                    >
                                      {updateMutation.isPending ? "Salvando..." : "Salvar"}
                                    </Button>
                                  </div>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={disableDelete}
                            onClick={() => {
                              if (disableDelete) return;
                              if (confirm("Tem certeza que deseja excluir este usuário?")) {
                                deleteMutation.mutate(user.id);
                              }
                            }}
                            data-testid={`button-delete-${user.id}`}
                          >
                            <span className="material-icons text-sm">delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code do Usuário</DialogTitle>
            <DialogDescription>
              Use este QR Code para confirmação rápida de empréstimos
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserForQR && (
            <QRCodeDisplay 
              user={selectedUserForQR} 
              onClose={() => setQrDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QRCodeDisplay({ user, onClose }: { user: User; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user.qrCode && canvasRef.current) {
      setIsLoading(true);
      
      QRCode.toCanvas(
        canvasRef.current,
        user.qrCode,
        {
          width: 300,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        },
        (error) => {
          if (error) {
            console.error("Error generating QR code:", error);
          }
          setIsLoading(false);
        }
      );

      QRCode.toDataURL(user.qrCode, { width: 600, margin: 2 }, (err, url) => {
        if (!err) {
          setQrImageUrl(url);
        }
      });
    }
    
    // Cleanup function
    return () => {
      setQrImageUrl("");
      setIsLoading(true);
    };
  }, [user.qrCode]);

  const handleDownload = () => {
    if (qrImageUrl) {
      const link = document.createElement("a");
      link.href = qrImageUrl;
      link.download = `qrcode-${user.username}.png`;
      link.click();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6 flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-md relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                <span className="material-icons animate-spin text-primary">refresh</span>
              </div>
            )}
            <canvas ref={canvasRef} data-testid="qr-code-canvas" />
          </div>
          
          <div className="text-center space-y-1">
            <p className="font-medium text-lg">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-sm text-muted-foreground">
              {user.matriculation}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleDownload}
          className="flex-1"
          data-testid="button-download-qr"
        >
          <span className="material-icons text-sm mr-2">download</span>
          Baixar QR Code
        </Button>
        <Button
          onClick={onClose}
          className="flex-1"
          data-testid="button-close-qr"
        >
          Fechar
        </Button>
      </div>
    </div>
  );
}
