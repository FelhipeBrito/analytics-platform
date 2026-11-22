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
- `TRUST_PROXY_HOPS`: quantidade de proxies reversos **confiáveis** entre cliente e API. Confirme a topologia do serviço antes de definir (normalmente 1 em hospedagem com um proxy de borda); não confie indiscriminadamente em cabeçalhos enviados pelo cliente.

O frontend usa `VITE_API_URL` caso a URL pública da API mude. A URL atual é usada como fallback.

## Segurança e privacidade
A API valida payloads, limita o tamanho do JSON, implementa um limitador simples de frequência por processo e não persiste o IP bruto em novas sessões. A estimativa geográfica é consultada via HTTPS em serviço externo (IPWho.is), que receberá o IP para processar a consulta. A aplicação remove query strings de URLs persistidas e não coleta dados antes de ação explícita na landing.

O rate limiter em memória **não substitui** um limitador compartilhado na infraestrutura quando existem múltiplas instâncias. O token de acesso não substitui autenticação com usuários, políticas de retenção ou trilhas de auditoria para produção. Defina prazo de retenção e política de exclusão conforme a finalidade e a LGPD.

`/visit/:sessionId/end` aceita somente uma estimativa limitada de duração da sessão. O evento enviado por `sendBeacon` pode não chegar, então duração pode permanecer nula. Identificadores no armazenamento local representam navegadores, não pessoas.

## Desenvolvimento
Em `apps/api`: `npm run dev`. Para frontends: `npm run dev` em `apps/landing` e `apps/dashboard`.
Configure as variáveis antes do deploy. O dashboard não funcionará antes de criar `DASHBOARD_TOKEN` e liberar sua origem em `ALLOWED_ORIGINS`.
