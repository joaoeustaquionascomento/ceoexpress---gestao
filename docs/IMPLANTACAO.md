# Implantação

Passo a passo para colocar o CEOEXPRESS | Gestão Estratégica no ar com Supabase e Vercel.
Faça primeiro em um ambiente de **homologação** e só depois repita em produção.

## 1. Supabase (banco, login e arquivos)

1. Crie uma conta em supabase.com e um projeto novo na região **South America (São Paulo)**.
   Guarde a senha do banco em local seguro.
2. Em **Project Settings > API**, copie a *Project URL*, a chave *anon* e a chave *service_role*.
3. Aplique as migrações, na ordem dos nomes de arquivo, de uma destas formas:
   - pelo **SQL Editor** do painel, colando e executando cada arquivo de `supabase/migrations/` (são 4 ou mais; respeite a ordem dos nomes); ou
   - pela CLI: `npx supabase link --project-ref <ref>` e `npx supabase db push`.
4. Carregue a base inicial da FIQ Brasil executando `supabase/seed/fiq-brasil.sql` no SQL Editor.
   O script pode ser executado mais de uma vez sem duplicar dados.
5. Em **Authentication > Sign In / Providers**:
   - desative **Allow new users to sign up** (novas contas só entram por convite);
   - mantenha **Email** habilitado e defina o tamanho mínimo de senha em 10.
6. Em **Authentication > URL Configuration**:
   - *Site URL*: o endereço do app (ex.: `https://app.ceoexpress.com.br`);
   - *Redirect URLs*: `https://app.ceoexpress.com.br/auth/callback`.
7. O link de redefinição já funciona com o modelo padrão do Supabase, em qualquer navegador. Depois de
   configurar um SMTP próprio (o Supabase só libera a edição de modelos com ele), troque em
   **Authentication > Emails > Reset password** o link por este, que abre uma página com o botão
   **Continuar** e não é gasto por robôs de segurança do e-mail:

   ```html
   <h2>Redefinir senha</h2>
   <p>Recebemos um pedido para redefinir a sua senha da CEOEXPRESS.</p>
   <p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery">Redefinir minha senha</a></p>
   <p>Se não foi você, ignore este e-mail.</p>
   ```

   O SMTP próprio (ex.: Resend) é obrigatório antes de liberar o app aos clientes: o SMTP padrão do Supabase
   só entrega e-mails para os membros da equipe do projeto no Supabase e tem limite baixo de envios.

### Primeiro administrador

1. Em **Authentication > Users > Add user**, crie o usuário com o e-mail da direção e marque *Auto Confirm User*.
2. No SQL Editor, execute (troque nome e e-mail):

```sql
insert into public.profiles (id, email, full_name, platform_role)
select id, email, 'Nome do Administrador', 'admin'
from auth.users where email = 'direcao@exemplo.com.br';
```

3. Entre no app com esse e-mail e senha. Os demais usuários são convidados pela tela **Usuários e convites**.

## 2. Vercel (hospedagem)

1. Importe o repositório do GitHub em vercel.com e escolha a região **São Paulo (gru1)** para as funções.
2. Configure as variáveis de ambiente (iguais às de `.env.example`):

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | chave anon |
| `SUPABASE_SERVICE_ROLE_KEY` | chave service_role (marque como *Sensitive*) |
| `NEXT_PUBLIC_SITE_URL` | endereço público do app |
| `RESEND_API_KEY` | (opcional) chave da Resend para o resumo diário de avisos (*Sensitive*) |
| `EMAIL_FROM` | (opcional) remetente, ex.: `CEOEXPRESS <nao-responda@ceoexpress.com.br>` (domínio verificado na Resend) |
| `CRON_SECRET` | (opcional) texto longo e aleatório; a Vercel o envia ao chamar `/api/cron/avisos` (*Sensitive*) |

O agendamento diário (8h de Brasília) está em `vercel.json`. Sem as três variáveis opcionais, nada é enviado.

3. Faça o deploy e configure o domínio próprio em **Settings > Domains**. O HTTPS é automático.

## 3. Conferência após a publicação

Execute estes passos com contas reais e anote o resultado. Até que isso seja feito, os fluxos de login,
convite e redefinição de senha **não estão validados de ponta a ponta**.

- [ ] Login e saída do administrador
- [ ] Criar empresa e projeto de teste
- [ ] Convidar um usuário do cliente, abrir o link em outro navegador (sem conta administrativa) e criar a senha
- [ ] Reutilizar o mesmo link: deve ser recusado
- [ ] Usuário do cliente vê só a própria empresa e o próprio projeto
- [ ] Convidar um segundo cliente em outra empresa e confirmar que um não vê o outro
- [ ] "Esqueci minha senha": receber o e-mail, redefinir e entrar com a nova senha
- [ ] Navegação no celular e instalação como app (Adicionar à tela inicial)

## 4. Backup e monitoramento

- O plano Pro do Supabase faz backup diário. Ative também o *Point in Time Recovery* se o orçamento permitir.
- Exporte o banco semanalmente (`npx supabase db dump`) para um armazenamento separado.
- Ative os logs da Vercel e, na fase 4, o Sentry para erros.

## Testes automatizados

O GitHub Actions (`.github/workflows/ci.yml`) roda lint, verificação de tipos, testes de unidade,
testes de banco em PostgreSQL 16 e o build a cada pull request.
