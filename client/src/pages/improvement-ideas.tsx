import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type VerificationStatus = "ok" | "attention" | "planned";

interface VerificationItem {
  title: string;
  status: VerificationStatus;
  note?: string;
}

interface ImprovementIdea {
  title: string;
  outcome: string;
  status: "Concluída" | "Em andamento" | "Backlog";
}

interface ImprovementArea {
  page: string;
  route: string;
  summary: string;
  owner: string;
  lastReview: string;
  verifications: VerificationItem[];
  ideas: ImprovementIdea[];
}

const statusVariants: Record<VerificationStatus, { label: string; badge: "default" | "secondary" | "destructive" }> = {
  ok: { label: "Verificado", badge: "default" },
  attention: { label: "Atenção", badge: "destructive" },
  planned: { label: "Planejado", badge: "secondary" },
};

const improvementAreas: ImprovementArea[] = [
  {
    page: "Dashboard",
    route: "/",
    summary:
      "Painel principal do Sistema JOMAGA com indicadores de estoque, empréstimos e alertas de calibração.",
    owner: "Equipe de Produto",
    lastReview: "15/01/2025",
    verifications: [
      {
        title: "Cards de métricas carregam números atualizados",
        status: "ok",
      },
      {
        title: "Listas de empréstimos e calibrações exibem estado vazio",
        status: "ok",
      },
      {
        title: "Necessidade de comparação com períodos anteriores",
        status: "attention",
        note: "Solicitado pela diretoria para acompanhar evolução mensal.",
      },
    ],
    ideas: [
      {
        title: "Adicionar variação percentual mês a mês",
        outcome: "Permitir leitura rápida de tendências",
        status: "Em andamento",
      },
      {
        title: "Criar widget de alertas críticos",
        outcome: "Destaque visual para calibrações vencidas",
        status: "Backlog",
      },
    ],
  },
  {
    page: "Ferramentas",
    route: "/tools",
    summary: "Tela de gestão do catálogo de ferramentas com filtros e ações administrativas.",
    owner: "Equipe de Operações",
    lastReview: "22/01/2025",
    verifications: [
      {
        title: "Tabela lista classes e modelos relacionados",
        status: "ok",
      },
      {
        title: "Exportação CSV para inventário",
        status: "planned",
        note: "Dependência da squad de relatórios para definição do formato final.",
      },
      {
        title: "Paginação mantém filtros aplicados",
        status: "attention",
        note: "Bug reportado por operadores durante testes com dados grandes.",
      },
    ],
    ideas: [
      {
        title: "Salvar filtros preferidos por usuário",
        outcome: "Reduzir tempo de busca em consultas frequentes",
        status: "Em andamento",
      },
      {
        title: "Visualização em cards para tablets",
        outcome: "Melhor leitura em dispositivos móveis",
        status: "Backlog",
      },
    ],
  },
  {
    page: "Empréstimos",
    route: "/loans",
    summary: "Fluxo de registro de empréstimo com confirmação pelo colaborador.",
    owner: "Equipe de Experiência do Usuário",
    lastReview: "28/01/2025",
    verifications: [
      {
        title: "Fluxo com múltiplas ferramentas gera termo de responsabilidade",
        status: "ok",
      },
      {
        title: "Confirmação por QR Code em dispositivos móveis",
        status: "ok",
      },
      {
        title: "Captura de assinatura digital",
        status: "planned",
        note: "Requer definição jurídica com departamento de compliance.",
      },
    ],
    ideas: [
      {
        title: "Salvar rascunhos de empréstimo",
        outcome: "Permitir finalizar processo após validações externas",
        status: "Backlog",
      },
      {
        title: "Checklist inteligente para operadores",
        outcome: "Prevenir esquecimentos antes da entrega",
        status: "Em andamento",
      },
    ],
  },
  {
    page: "Relatórios",
    route: "/reports",
    summary: "Módulo de geração de relatórios PDF e exportação do inventário.",
    owner: "Squad de Dados",
    lastReview: "05/02/2025",
    verifications: [
      {
        title: "Filtros obrigatórios exibem alerta",
        status: "ok",
      },
      {
        title: "Relatório de calibração lista dias restantes",
        status: "ok",
      },
      {
        title: "Exportação Excel para inventário",
        status: "attention",
        note: "Arquivo gerado com colunas trocadas ao usar delimitador regional.",
      },
    ],
    ideas: [
      {
        title: "Dashboards com séries históricas",
        outcome: "Visão consolidada para reuniões mensais",
        status: "Em andamento",
      },
      {
        title: "Envio automático por e-mail",
        outcome: "Automatizar rotina semanal do time de qualidade",
        status: "Backlog",
      },
    ],
  },
  {
    page: "Calibração",
    route: "/calibration",
    summary: "Lista ferramentas com intervalo de calibração e próximos vencimentos.",
    owner: "Time de Qualidade",
    lastReview: "11/02/2025",
    verifications: [
      {
        title: "Indicadores por cores estão alinhados com SLA",
        status: "ok",
      },
      {
        title: "Alertas podem ser reconhecidos pelo responsável",
        status: "ok",
      },
      {
        title: "Histórico de calibração acessível pela ferramenta",
        status: "planned",
        note: "Depende de migração de dados legados do antigo sistema.",
      },
    ],
    ideas: [
      {
        title: "Integração com agenda corporativa",
        outcome: "Criar lembretes automáticos para técnicos",
        status: "Backlog",
      },
      {
        title: "Relatório auditável de calibrações",
        outcome: "Atender auditorias ISO sem exportações manuais",
        status: "Em andamento",
      },
    ],
  },
];

function renderIdeaStatus(status: ImprovementIdea["status"]) {
  const variant = status === "Concluída"
    ? "default"
    : status === "Em andamento"
      ? "secondary"
      : "outline";

  return <Badge variant={variant}>{status}</Badge>;
}

export default function ImprovementIdeas() {
  return (
    <div className="p-6 space-y-6" data-testid="page-improvement-ideas">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Ideias de Melhoria</h1>
        <p className="text-muted-foreground">
          Visão consolidada das verificações realizadas e das iniciativas planejadas para cada página do Sistema JOMAGA.
        </p>
      </div>

      <div className="grid gap-6">
        {improvementAreas.map((area) => (
          <Card key={area.page} data-testid={`card-${area.page.toLowerCase()}`}>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <CardTitle className="text-2xl">{area.page}</CardTitle>
                  <CardDescription>{area.summary}</CardDescription>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary">Rota {area.route}</Badge>
                  <span>Responsável: <strong>{area.owner}</strong></span>
                  <span>Última revisão: {area.lastReview}</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3">Verificações recentes</h3>
                <div className="space-y-3">
                  {area.verifications.map((verification, index) => {
                    const config = statusVariants[verification.status];
                    return (
                      <div
                        key={`${area.page}-verification-${index}`}
                        className="flex flex-col gap-1 rounded-md border p-3 bg-muted/40"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium text-sm">{verification.title}</span>
                          <Badge variant={config.badge}>{config.label}</Badge>
                        </div>
                        {verification.note && (
                          <p className="text-xs text-muted-foreground">{verification.note}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <Separator />

              <section>
                <h3 className="text-lg font-semibold mb-3">Ideias em acompanhamento</h3>
                <div className="space-y-3">
                  {area.ideas.map((idea, index) => (
                    <div
                      key={`${area.page}-idea-${index}`}
                      className="flex flex-col gap-1 rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-sm">{idea.title}</span>
                        {renderIdeaStatus(idea.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">{idea.outcome}</p>
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

