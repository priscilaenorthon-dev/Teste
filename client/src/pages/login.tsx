import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const loginSchema = z.object({
  username: z.string().min(1, "Username é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao fazer login');
      }

      const user = await response.json();
      
      // Invalidate and refetch user query
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo, ${user.firstName} ${user.lastName}`,
      });

      // Redirect to dashboard
      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute -left-10 top-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="grid w-full max-w-5xl gap-6 overflow-hidden rounded-3xl bg-background/95 shadow-2xl backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative hidden flex-col justify-between bg-gradient-to-br from-primary to-primary/80 p-10 text-primary-foreground lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.15),_transparent_65%)]" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3 text-primary-foreground/80">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15">
                  <span className="material-icons text-3xl">handyman</span>
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-primary-foreground/70">JOMAGA</p>
                  <h1 className="text-3xl font-semibold">Centro de Ferramentas</h1>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold leading-tight">Controle total de empréstimos em um só lugar</h2>
                <p className="text-primary-foreground/80">
                  Organize ferramentas, acompanhe prazos e mantenha a equipe alinhada com um sistema feito para o dia a dia da operação.
                </p>
              </div>

              <ul className="space-y-3 text-sm font-medium">
                {["Dashboard com indicadores em tempo real", "Fluxo de empréstimo guiado e intuitivo", "Termo de responsabilidade gerado automaticamente"].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      <span className="material-icons text-base">check</span>
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative z-10 space-y-2 text-xs text-primary-foreground/70">
              <p className="font-medium uppercase tracking-[0.25em]">Acesso seguro</p>
              <p>Uso exclusivo de operadores autorizados. Dados protegidos com autenticação individual.</p>
            </div>
          </div>

          <div className="relative flex flex-col justify-center p-6 sm:p-10">
            <div className="mx-auto w-full max-w-md space-y-6">
              <div className="space-y-2 text-center lg:text-left">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary lg:mx-0">
                  <span className="material-icons text-3xl">login</span>
                </div>
                <CardTitle className="text-3xl font-bold">Bem-vindo de volta</CardTitle>
                <CardDescription className="text-base">
                  Faça login com suas credenciais corporativas para acessar o Sistema JOMAGA.
                </CardDescription>
              </div>

              <Card className="border-none shadow-lg">
                <CardContent className="pt-6">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                data-testid="input-username"
                                placeholder="Digite seu username"
                                autoComplete="username"
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                data-testid="input-password"
                                placeholder="Digite sua senha"
                                autoComplete="current-password"
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isLoading}
                        data-testid="button-submit-login"
                      >
                        {isLoading ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Entrando...
                          </div>
                        ) : (
                          "Entrar"
                        )}
                      </Button>
                    </form>
                  </Form>

                  <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
                    <p>Precisa de ajuda? Entre em contato com o time de suporte interno.</p>
                    <p className="text-xs">O acesso é exclusivo para colaboradores autorizados.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
