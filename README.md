# Web Lab — Analytics Platform

Laboratório de APIs de navegador e análise de visitas, em React/Vite e Express/Prisma/PostgreSQL.

## Aplicações
- `apps/landing`: diagnóstico **local** das características disponibilizadas pelo navegador e botão separado para consentir em registrar visita.
- `apps/api`: `POST /visit`, `POST /visit/:sessionId/end` e `GET /stats`.
- `apps/dashboard`: visualização privada das estatísticas e últimas sessões.

## Configuração da API
Defina em seu serviço Render (ou ambiente de execução):
- `DATABASE_URL`: conexão PostgreSQL existente.
- `DASHBOARD_TOKEN`: segredo **aleatório com pelo menos 24 caracteres**, usado em `Authorization: Bearer <token>` para consultar o dashboard. Sem ele, `/stats` retorna 503.
- `ALLOWED_ORIGINS`: origens do landing e dashboard, separadas por vírgula. Exemplo: `https://analytics-platform-landing.vercel.app,https://SEU-DASHBOARD.vercel.app,http://localhost:5173`.
- `TRUST_PROXY_HOPS`: mantenha `0` até confirmar o número de proxies confiáveis. Não configure `true` indiscriminadamente.
- `GEOIP_TRUST_CF_HEADER`: opcional. Defina como `true` **somente se** confirmar que a borda do serviço Render/Cloudflare sobrescreve e autentica o cabeçalho `CF-Connecting-IP`; caso contrário, deixe desativado. Isso afeta a estimativa de localização e o rate limiting.

O frontend usa `VITE_API_URL` caso a URL pública da API mude. A URL atual é usada como fallback.

## Segurança e privacidade
A API valida payloads, limita o tamanho do JSON, implementa um limitador simples de frequência por processo e não persiste o IP bruto em novas sessões. A estimativa geográfica é consultada via HTTPS em serviço externo (IPWho.is), que receberá o IP para processar a consulta. A aplicação remove query strings de URLs persistidas e não coleta dados antes de ação explícita na landing.

O rate limiter em memória **não substitui** um limitador compartilhado na infraestrutura quando existem múltiplas instâncias. O token de acesso não substitui autenticação com usuários, políticas de retenção ou trilhas de auditoria para produção. Defina prazo de retenção e política de exclusão conforme a finalidade e a LGPD.

`/visit/:sessionId/end` aceita somente uma estimativa limitada de duração da sessão. O evento enviado por `sendBeacon` pode não chegar, então duração pode permanecer nula. Identificadores no armazenamento local representam navegadores, não pessoas.

## Desenvolvimento
Em `apps/api`: `npm run dev`. Para frontends: `npm run dev` em `apps/landing` e `apps/dashboard`.
Configure as variáveis antes do deploy. O dashboard não funcionará antes de criar `DASHBOARD_TOKEN` e liberar sua origem em `ALLOWED_ORIGINS`.

## Publicação do dashboard
1. Crie um projeto Vercel a partir do mesmo repositório.
2. Configure **Root Directory** para `apps/dashboard`; framework Vite. Use `npm run build` e diretório de saída `dist`.
3. Se necessário configure `VITE_API_URL=https://analytics-platform-1-isvp.onrender.com` (sem barra final).
4. Depois do deploy, adicione a origem real do dashboard em `ALLOWED_ORIGINS` no Render, separada por vírgula da origem da landing. Faça deploy da API.
5. Digite o token somente na tela do dashboard. Nunca inclua o token em variáveis `VITE_*`.

## Verificação
- `/stats` sem token deve retornar 401; com o token atual deve retornar 200.
- Depois de habilitar `GEOIP_TRUST_CF_HEADER` com ingress confiável, faça um **novo** registro voluntário de visita e confira o país. Os registros históricos incorretos de Portland/Oregon não serão alterados automaticamente.
- Substitua a chave já compartilhada publicamente, usando um token secreto novo no Render; evite registrá-lo em terminal ou logs.
