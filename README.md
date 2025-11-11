# Ferramentaria Management

Este projeto é uma aplicação web full-stack para gerenciamento de ferramentas, construída com React, Express e Drizzle ORM.

## Pré-requisitos

- **Node.js** versão 20 ou superior (recomendado 20.x LTS).
- **npm** (instalado juntamente com o Node.js).
- Um banco de dados PostgreSQL acessível via URL de conexão (compatível com Neon, Supabase ou instâncias próprias).

## Configuração do ambiente

1. Instale as dependências do projeto:
   ```bash
   npm install
   ```
2. Crie um arquivo `.env` na raiz do projeto com as variáveis necessárias:
   ```bash
   DATABASE_URL="postgres://usuario:senha@host:5432/database"
   SESSION_SECRET="chave-secreta-aleatoria"
   REPL_ID="opcional-em-ambientes-replit"
   ISSUER_URL="https://replit.com/oidc" # ajuste conforme o provedor de OIDC
   PORT=5000 # porta utilizada pela API/cliente no modo produção
   ```
   > Ajuste os valores conforme o seu ambiente. `REPL_ID` e `ISSUER_URL` são necessários apenas quando a autenticação via Replit estiver habilitada.

## Execução em desenvolvimento

Inicie o servidor Express e o client Vite em modo desenvolvimento:
```bash
npm run dev
```

## Build de produção

Gere os artefatos de produção do client e do servidor com:
```bash
npm run build
```

## Popular o banco de dados com dados de exemplo

Após configurar o banco de dados (ex.: executar migrações com `npm run db:push`), você pode inserir usuários, classes de ferramentas e ferramentas de exemplo executando:
```bash
npm run seed
```
O script de seed evita sobrescrever registros existentes verificando a presença de usuários (por `username`), classes (por `name`), modelos (por `name`) e ferramentas (por `code`) antes de inserir novos dados.

## Outros scripts úteis

- `npm run check`: executa a verificação de tipos com TypeScript.
- `npm run db:push`: aplica o schema do Drizzle ao banco configurado.

## Estrutura do projeto

- `client/`: código do frontend em React.
- `server/`: API Express, configurações de banco e scripts utilitários.
- `shared/`: tipos e schema compartilhados entre cliente e servidor.

## Licença

Este projeto é distribuído sob a licença MIT.
