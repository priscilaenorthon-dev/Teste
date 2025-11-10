# 🚀 GUIA DE IMPORTAÇÃO PARA PRODUÇÃO - Sistema JOMAGA

## 📊 Dados Exportados do Desenvolvimento

✅ **132 linhas SQL** contendo:
- **7 usuários** (com senhas hasheadas e QR Codes)
- **45 ferramentas** (todas com quantidades e status variados)
- **3 classes de ferramentas**
- **3 modelos de ferramentas** (Normal, Calibração Paquimetro, Parafusadeira Nova)
- **8 empréstimos** (histórico de exemplo)
- **2 sessões** (podem ser ignoradas em produção)

---

## ⚠️ IMPORTANTE - LEIA ANTES DE IMPORTAR

### 🔴 **ATENÇÃO: Esta operação irá:**
- ❌ **APAGAR todos os dados existentes** na produção
- ✅ **Substituir pelos dados de desenvolvimento**
- 🔒 **As senhas estão hasheadas com bcrypt** (seguras)

### ✅ **Backup Recomendado:**
Antes de importar, faça backup do banco de produção atual (se houver dados importantes).

---

## 📝 PASSO A PASSO - Importação para Produção

### **Método 1: Via Interface Replit (RECOMENDADO)**

1. **Acesse o painel de Database:**
   - No Replit, clique na aba **"Database"** no menu lateral
   - Selecione **"Production"** (banco de produção)

2. **Acesse o Console SQL:**
   - Clique em **"Console"** ou **"Query"**

3. **Limpe os dados antigos (CUIDADO!):**
   ```sql
   -- Execute APENAS se quiser apagar tudo e começar do zero
   TRUNCATE TABLE loans CASCADE;
   TRUNCATE TABLE tools CASCADE;
   TRUNCATE TABLE tool_models CASCADE;
   TRUNCATE TABLE tool_classes CASCADE;
   TRUNCATE TABLE users CASCADE;
   TRUNCATE TABLE sessions CASCADE;
   ```

4. **Copie e cole o conteúdo do arquivo:**
   - Abra o arquivo `production-data-export.sql` neste projeto
   - **Copie TODO o conteúdo**
   - **Cole no console SQL do banco de produção**
   - Clique em **"Execute"** ou **"Run"**

5. **Verifique se deu certo:**
   ```sql
   SELECT COUNT(*) FROM users;    -- Deve retornar 7
   SELECT COUNT(*) FROM tools;    -- Deve retornar 45
   SELECT COUNT(*) FROM tool_classes; -- Deve retornar 3
   ```

---

### **Método 2: Via Linha de Comando (Avançado)**

Se você tiver acesso direto ao servidor de produção:

1. **Conecte ao banco de produção:**
   ```bash
   psql $PRODUCTION_DATABASE_URL
   ```

2. **Limpe dados antigos:**
   ```sql
   TRUNCATE TABLE loans, tools, tool_models, tool_classes, users, sessions CASCADE;
   ```

3. **Importe o arquivo:**
   ```bash
   psql $PRODUCTION_DATABASE_URL < production-data-export.sql
   ```

---

### **Método 3: Exportar apenas dados específicos (Opcional)**

Se você quiser importar apenas alguns dados (ex: só ferramentas):

1. **Criar exports seletivos:**
   ```bash
   # Apenas usuários
   pg_dump $DATABASE_URL --data-only --table=users > users-only.sql
   
   # Apenas ferramentas
   pg_dump $DATABASE_URL --data-only --table=tools > tools-only.sql
   ```

2. **Importar seletivamente no console de produção**

---

## 🔐 Credenciais que estarão disponíveis após importação

### **Administradores:**
- `admin` / `password123`
- `priscilaenorthon` / `senha123`

### **Operadores:**
- `operator` / `password123`

### **Colaboradores:**
- `user` / `password123`
- `pasdasds` / `senha123`
- `u2tag2009` / `senha123`

---

## ✅ Checklist Pós-Importação

Após importar, faça login no sistema de **produção** e verifique:

- [ ] Login como admin funciona
- [ ] Dashboard mostra as 45 ferramentas
- [ ] Usuários estão cadastrados
- [ ] QR Codes funcionam (clique no ícone QR na página de usuários)
- [ ] Empréstimos estão no histórico
- [ ] Calibrações aparecem corretamente

---

## 🛡️ Segurança

### **As senhas estão seguras?**
✅ **SIM!** Todas as senhas foram hasheadas com **bcrypt** (10 rounds).
- Ninguém pode ver a senha original
- Mesmo com acesso ao banco, não dá para descobrir a senha
- É seguro deixar no arquivo SQL

### **Os QR Codes estão salvos?**
✅ **SIM!** Cada usuário tem um QR Code único gerado com `nanoid(16)`.
- Você pode baixar novamente na interface
- Pronto para impressão em crachás

---

## ⚡ Dicas Importantes

1. **Faça backup antes de importar!**
   - Se tiver dados em produção, exporte primeiro

2. **Teste em ambiente staging primeiro:**
   - Se possível, teste a importação em um ambiente de teste antes

3. **Senhas de produção:**
   - Após importar, peça aos usuários para trocar as senhas
   - Ou use a função de "Resetar senha" para senhas mais seguras

4. **Monitoring:**
   - Após importar, monitore o sistema por alguns dias
   - Verifique logs de erro

---

## 📞 Troubleshooting

### **Erro: "duplicate key value violates unique constraint"**
- **Causa:** Já existem dados com os mesmos IDs
- **Solução:** Execute `TRUNCATE` antes de importar

### **Erro: "relation does not exist"**
- **Causa:** As tabelas não foram criadas ainda
- **Solução:** Execute as migrations primeiro (`npm run db:push`)

### **Erro: "permission denied"**
- **Causa:** Sem permissão no banco de produção
- **Solução:** Verifique as credenciais ou peça acesso de admin

---

## 🎯 Próximos Passos

Após importar os dados:

1. ✅ Teste todas as funcionalidades principais
2. ✅ Baixe os QR Codes dos usuários para imprimir crachás
3. ✅ Configure alertas de calibração
4. ✅ Treine sua equipe no sistema
5. ✅ Monitore o primeiro dia de uso

---

**Sucesso na importação! 🚀**

Se encontrar problemas, revise este guia ou entre em contato com o suporte técnico.
