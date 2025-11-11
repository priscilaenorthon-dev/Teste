import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { AuditLogWithActor, Tool, User } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

type AuditLogEntry = Omit<AuditLogWithActor, "createdAt"> & { createdAt: string };

function formatUserName(user?: Pick<User, "firstName" | "lastName" | "username"> | null) {
  if (!user) {
    return "Usuário desconhecido";
  }
  const parts = [user.firstName?.trim() || "", user.lastName?.trim() || ""].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return user.username || "Usuário desconhecido";
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  move: "Movimentação",
};

function AuditLogList({
  logs,
  isLoading,
  emptyMessage,
}: {
  logs?: AuditLogEntry[];
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-4">
      {logs.map((log) => {
        const actorName = formatUserName(log.actor ?? null);
        const actionLabel = ACTION_LABELS[log.action] || log.action;
        const metadata = (log.metadata || {}) as Record<string, unknown>;
        const movement = typeof metadata.movement === "string" ? metadata.movement : undefined;
        const quantity = typeof metadata.quantity === "number" ? metadata.quantity : undefined;

        return (
          <div key={log.id} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {actionLabel}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <span className="text-sm font-medium">{actorName}</span>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-foreground">{log.description}</p>

            {(movement || quantity) && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {movement && (
                  <span className="rounded-full bg-muted px-2 py-1 capitalize">
                    Movimentação: {movement === "loan" ? "empréstimo" : movement === "return" ? "devolução" : movement}
                  </span>
                )}
                {typeof metadata.loanId === "string" && (
                  <span className="rounded-full bg-muted px-2 py-1">Lote/Empréstimo: {metadata.loanId}</span>
                )}
                {quantity !== undefined && (
                  <span className="rounded-full bg-muted px-2 py-1">Quantidade: {quantity}</span>
                )}
              </div>
            )}

            {(log.beforeData || log.afterData) && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-primary">Ver detalhes da alteração</summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {log.beforeData && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Antes</p>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/60 p-3 text-xs">
                        {JSON.stringify(log.beforeData, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.afterData && (
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Depois</p>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/60 p-3 text-xs">
                        {JSON.stringify(log.afterData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        );
      })}
    </div>
  );
}

async function fetchAuditLogs(params: Record<string, string>): Promise<AuditLogEntry[]> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`/api/audit/logs?${query}`, {
    credentials: "include",
  });
  if (!response.ok) {
    const message = (await response.text()) || "Erro ao buscar logs";
    throw new Error(message);
  }
  const payload = (await response.json()) as AuditLogWithActor[];
  return payload.map((log) => ({
    ...log,
    createdAt:
      typeof (log as any).createdAt === "string"
        ? ((log as any).createdAt as string)
        : log.createdAt instanceof Date
          ? log.createdAt.toISOString()
          : new Date().toISOString(),
  }));
}

export default function AuditPage() {
  const { isAdmin } = useAuth();
  const [selectedToolId, setSelectedToolId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const {
    data: tools,
    isLoading: isLoadingTools,
    error: toolsError,
  } = useQuery<Tool[]>({
    queryKey: ["/api/tools"],
  });

  const {
    data: users,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const {
    data: toolLogs,
    isFetching: isFetchingToolLogs,
    error: toolLogsError,
  } = useQuery<AuditLogEntry[]>({
    queryKey: ["auditLogs", "tool", selectedToolId],
    enabled: !!selectedToolId,
    queryFn: () => fetchAuditLogs({ targetType: "tool", targetId: selectedToolId }),
  });

  const {
    data: userLogs,
    isFetching: isFetchingUserLogs,
    error: userLogsError,
  } = useQuery<AuditLogEntry[]>({
    queryKey: ["auditLogs", "user", selectedUserId],
    enabled: !!selectedUserId,
    queryFn: () => fetchAuditLogs({ userId: selectedUserId }),
  });

  const sortedTools = useMemo(() => {
    if (!tools) return [] as Tool[];
    return [...tools].sort((a, b) => a.name.localeCompare(b.name));
  }, [tools]);

  const sortedUsers = useMemo(() => {
    if (!users) return [] as User[];
    return [...users].sort((a, b) => {
      const nameA = `${a.firstName || ""} ${a.lastName || ""}`.trim() || a.username;
      const nameB = `${b.firstName || ""} ${b.lastName || ""}`.trim() || b.username;
      return nameA.localeCompare(nameB);
    });
  }, [users]);

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Acesso restrito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Somente administradores podem visualizar os registros de auditoria.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Histórico e Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          Consulte movimentações, alterações de dados e ações de usuários em todo o sistema.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Histórico por ferramenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingTools ? (
              <Skeleton className="h-10 w-full" />
            ) : toolsError ? (
              <p className="text-sm text-destructive">
                Erro ao carregar ferramentas: {(toolsError as Error).message}
              </p>
            ) : (
              <Select value={selectedToolId} onValueChange={setSelectedToolId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma ferramenta" />
                </SelectTrigger>
                <SelectContent>
                  {sortedTools.map((tool) => (
                    <SelectItem key={tool.id} value={tool.id}>
                      {tool.name} ({tool.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {toolLogsError && (
              <p className="text-sm text-destructive">
                Erro ao carregar histórico: {(toolLogsError as Error).message}
              </p>
            )}

            <AuditLogList
              logs={toolLogs}
              isLoading={isFetchingToolLogs}
              emptyMessage={selectedToolId ? "Nenhum registro encontrado para esta ferramenta." : "Selecione uma ferramenta para visualizar o histórico."}
            />
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Histórico por usuário</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingUsers ? (
              <Skeleton className="h-10 w-full" />
            ) : usersError ? (
              <p className="text-sm text-destructive">
                Erro ao carregar usuários: {(usersError as Error).message}
              </p>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {sortedUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {formatUserName(user)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {userLogsError && (
              <p className="text-sm text-destructive">
                Erro ao carregar histórico: {(userLogsError as Error).message}
              </p>
            )}

            <AuditLogList
              logs={userLogs}
              isLoading={isFetchingUserLogs}
              emptyMessage={selectedUserId ? "Nenhum registro encontrado para este usuário." : "Selecione um usuário para visualizar o histórico."}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
