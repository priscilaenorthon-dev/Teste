import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-icons text-primary text-3xl">build</span>
            <h1 className="text-2xl font-bold">Sistema JOMAGA</h1>
          </div>
          <Button data-testid="button-login" onClick={() => window.location.href = "/api/login"}>
            Fazer Login
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">Controle Profissional de Ferramentas</h2>
          <p className="text-lg text-muted-foreground mb-8">
            O Sistema JOMAGA oferece gestão completa de empréstimos, devoluções, inventário e calibração de ferramentas com eficiência e segurança
          </p>
          <Button 
            size="lg" 
            className="min-h-12"
            data-testid="button-login-main"
            onClick={() => window.location.href = "/api/login"}
          >
            Acessar Sistema
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons text-primary">inventory_2</span>
                <CardTitle>Gestão de Inventário</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Controle completo de todas as ferramentas com status em tempo real, 
                quantidade disponível e histórico de movimentações
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons text-primary">swap_horiz</span>
                <CardTitle>Empréstimos e Devoluções</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Processo simplificado com confirmação dupla e geração automática 
                de termo de cautela digital para cada empréstimo
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <span className="material-icons text-primary">event</span>
                <CardTitle>Controle de Calibração</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Alertas automáticos para ferramentas que necessitam calibração, 
                garantindo conformidade e precisão das medições
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div>
            <h3 className="text-xl font-semibold mb-4">Perfis de Acesso</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="material-icons text-primary text-sm mt-1">check_circle</span>
                <div>
                  <strong className="block">Administrador:</strong>
                  <span className="text-sm text-muted-foreground">Acesso total ao sistema</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-icons text-primary text-sm mt-1">check_circle</span>
                <div>
                  <strong className="block">Operador:</strong>
                  <span className="text-sm text-muted-foreground">Gerencia empréstimos e devoluções</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-icons text-primary text-sm mt-1">check_circle</span>
                <div>
                  <strong className="block">Usuário:</strong>
                  <span className="text-sm text-muted-foreground">Consulta ferramentas emprestadas</span>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Funcionalidades</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="material-icons text-primary text-sm mt-1">verified</span>
                <span className="text-sm">Dashboard com métricas em tempo real</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-icons text-primary text-sm mt-1">verified</span>
                <span className="text-sm">Relatórios detalhados em PDF</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-icons text-primary text-sm mt-1">verified</span>
                <span className="text-sm">Histórico completo de movimentações</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="material-icons text-primary text-sm mt-1">verified</span>
                <span className="text-sm">Sistema de alertas automáticos</span>
              </li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="border-t bg-card py-6">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>Sistema JOMAGA © {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
