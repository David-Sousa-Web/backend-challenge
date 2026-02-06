# Cinema Tickets API

## Visão Geral

API REST para venda de ingressos de cinema com controle de concorrência, reserva temporária de assentos (TTL 30s), confirmação de pagamento e mensageria assíncrona. O sistema garante que nenhum assento seja vendido duas vezes, mesmo sob alta concorrência e com múltiplas instâncias da aplicação rodando simultaneamente.

## Tecnologias Escolhidas

**Banco de dados — PostgreSQL 16**

Banco relacional com transactions ACID e suporte nativo a `SELECT ... FOR UPDATE` (lock pessimista por row). Essencial para garantir atomicidade na reserva e pagamento de assentos. Combinado com Prisma 7 como ORM para migrations automáticas e interactive transactions.

**Cache e lock distribuído — Redis 7**

Usado em três frentes: (1) lock distribuído via Redlock para serializar reservas concorrentes na mesma sessão, (2) tracking de reservas com TTL para rastreamento em tempo real, e (3) invalidação de cache de disponibilidade de assentos. Redis é in-memory, o que torna o lock muito mais barato que contenção direta no Postgres.

**Mensageria — RabbitMQ 3**

Fila durável com entrega garantida para desacoplar side effects (tracking, invalidação de cache, geração de ingressos digitais) do fluxo principal. Inclui Dead Letter Queue para mensagens que falham no processamento. A distribuição round-robin entre consumers garante que cada evento seja processado por exatamente uma instância.

## Como Executar

### Pré-requisitos

- Docker e Docker Compose

### Subir o ambiente

```bash
docker-compose up --build
```

Isso inicia PostgreSQL, Redis, RabbitMQ e a aplicação. As migrations do Prisma e o seed rodam automaticamente no startup do container.

| Serviço             | URL                                             |
| ------------------- | ----------------------------------------------- |
| API                 | http://localhost:3000                           |
| Swagger             | http://localhost:3000/api-docs                  |
| Health Check        | http://localhost:3000/health                    |
| RabbitMQ Management | http://localhost:15672 (cinema / cinema_secret) |

### Dados iniciais (Seed)

O seed cria 2 usuários e 3 sessões de cinema (32 assentos cada). **Roda automaticamente** no startup do container (é idempotente, não duplica dados).

Para rodar manualmente:

| Usuário | Email           | Senha  |
| ------- | --------------- | ------ |
| Alice   | alice@email.com | 123456 |
| Bob     | bob@email.com   | 123456 |

| Sessão               | Sala   | Horário          | Preço    |
| -------------------- | ------ | ---------------- | -------- |
| Vingadores: Ultimato | Sala 1 | 10/02/2026 19:00 | R$ 25,00 |
| Matrix Resurrections | Sala 2 | 10/02/2026 21:00 | R$ 30,00 |
| Interstellar         | Sala 3 | 11/02/2026 15:00 | R$ 20,00 |

### Executar testes

```bash
npm run test
npm run test:cov
npm run test:e2e  
```

## Estratégias Implementadas

### Como resolvi race conditions

Dupla camada de proteção — Redlock no Redis + lock pessimista no PostgreSQL.

**Camada 1 — Redlock (Redis)**

Antes de acessar o banco, a aplicação adquire um lock distribuído por sessão:

```
lock:session:{sessionId} → TTL 5s, 3 retries, 200ms delay + 100ms jitter
```

Apenas 1 request por sessão passa por vez. Os demais esperam no Redis, que é ordens de grandeza mais rápido que contenção no Postgres.

**Camada 2 — SELECT ... FOR UPDATE (PostgreSQL)**

Dentro de uma interactive transaction, as rows dos assentos são travadas:

```sql
SELECT id, status FROM seats
WHERE id IN ($1, $2) AND session_id = $3
ORDER BY id
FOR UPDATE
```

Se o Redlock falhar (Redis fora do ar, por exemplo), o Postgres ainda garante que dois requests não modifiquem o mesmo assento simultaneamente.

Adicionalmente, o header `Idempotency-Key` na criação de reservas previne duplicatas em caso de retry do cliente.

### Como garanti coordenação entre múltiplas instâncias

- **Redlock** opera sobre o Redis compartilhado — todas as instâncias competem pelo mesmo lock, independente de qual recebe o request
- **RabbitMQ** distribui mensagens round-robin entre consumers — cada evento é processado por exatamente uma instância
- **Cron de expiração** roda em cada instância, mas a query SQL usa uma transaction atômica (`UPDATE ... WHERE status = 'PENDING' AND expires_at < now()`) — não há risco de expirar a mesma reserva duas vezes

### Como preveni deadlocks

Seat IDs são **ordenados** (`[...seatIds].sort()`) antes de qualquer operação de lock. Se Usuário A quer assentos [3, 1] e Usuário B quer [1, 3], ambos travam na ordem [1, 3] — nunca em ordens opostas. Isso elimina a possibilidade de deadlock por inversão de ordem de aquisição de locks.

## Endpoints da API

Todos os endpoints (exceto auth e health) exigem header `Authorization: Bearer <JWT>`.

A documentação interativa completa está disponível em http://localhost:3000/api-docs (Swagger).

### Auth

**Registrar usuário**

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@email.com", "password": "123456"}'
```

**Login**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@email.com", "password": "123456"}'
# Resposta: { "access_token": "eyJhbG..." }
```

### Sessions

**Criar sessão** — `POST /sessions`

```bash
curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "movieTitle": "Matrix",
    "room": "Sala 2",
    "startsAt": "2026-03-15T20:00:00.000Z",
    "ticketPriceInCents": 3000,
    "seats": ["A1","A2","A3","A4","B1","B2","B3","B4","C1","C2","C3","C4","D1","D2","D3","D4"]
  }'
```

**Listar sessões** — `GET /sessions`

```bash
curl http://localhost:3000/sessions -H "Authorization: Bearer <TOKEN>"
```

**Detalhes de uma sessão** — `GET /sessions/:id`

```bash
curl http://localhost:3000/sessions/<SESSION_ID> -H "Authorization: Bearer <TOKEN>"
```

**Todos os assentos** — `GET /sessions/:id/seats`

```bash
curl http://localhost:3000/sessions/<SESSION_ID>/seats -H "Authorization: Bearer <TOKEN>"
```

**Assentos disponíveis** — `GET /sessions/:id/seats/available`

```bash
curl http://localhost:3000/sessions/<SESSION_ID>/seats/available -H "Authorization: Bearer <TOKEN>"
```

### Reservations

**Reservar assentos** — `POST /reservations` (TTL 30s, suporta `Idempotency-Key` header)

```bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Idempotency-Key: minha-chave-unica" \
  -d '{"sessionId": "<SESSION_ID>", "seatIds": ["<SEAT_ID_1>", "<SEAT_ID_2>"]}'
```

**Cancelar reserva** — `PATCH /reservations/:id/cancel`

```bash
curl -X PATCH http://localhost:3000/reservations/<RESERVATION_ID>/cancel \
  -H "Authorization: Bearer <TOKEN>"
```

**Minhas reservas** — `GET /reservations/my`

```bash
curl http://localhost:3000/reservations/my -H "Authorization: Bearer <TOKEN>"
```

**Detalhes de uma reserva** — `GET /reservations/:id`

```bash
curl http://localhost:3000/reservations/<RESERVATION_ID> -H "Authorization: Bearer <TOKEN>"
```

### Payments

**Confirmar pagamento** — `POST /payments/confirm`

```bash
curl -X POST http://localhost:3000/payments/confirm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"reservationId": "<RESERVATION_ID>"}'
```

**Histórico de compras** — `GET /payments/history`

```bash
curl http://localhost:3000/payments/history -H "Authorization: Bearer <TOKEN>"
```

**Detalhes de uma venda** — `GET /payments/:id`

```bash
curl http://localhost:3000/payments/<SALE_ID> -H "Authorization: Bearer <TOKEN>"
```

### Health

```bash
curl http://localhost:3000/health
# Resposta: { "status": "ok", "postgres": "connected", "redis": "connected" }
```

## Decisões Técnicas

1. **Dupla camada de lock (Redlock + FOR UPDATE)** — Redlock sozinho não é suficiente porque Martin Kleppmann demonstrou que ele pode falhar em cenários de clock drift. O `SELECT ... FOR UPDATE` no Postgres funciona como safety net. A combinação garante consistência mesmo se o Redis cair.

2. **Repository Pattern com abstração** — Cada módulo define uma abstract class como contrato e uma implementação Prisma concreta. O service depende da abstração, não do ORM. Permite trocar a persistência ou mockar em testes sem alterar lógica de negócio.

3. **Transação síncrona no pagamento** — A confirmação de pagamento (atualizar reserva → marcar assentos como SOLD → criar Sale) é uma única transaction no Postgres, não um fluxo via eventos. Eventos são emitidos depois do commit para side effects assíncronos (tracking, ingresso digital). Isso garante que o estado da compra seja sempre consistente.

4. **Validação de environment no startup** — `class-validator` valida todas as variáveis de ambiente no boot da aplicação. Se alguma estiver faltando ou inválida, a app não sobe (fail-fast). O objeto `env` tipado é exportado como single source of truth — nenhum arquivo acessa `process.env` diretamente.

5. **Hybrid application (HTTP + RabbitMQ)** — A app sobe como servidor HTTP e consumer RabbitMQ no mesmo processo via `startAllMicroservices()`. Um único container faz tudo, simplificando deploy e operação sem abrir mão do processamento assíncrono.

## Diferenciais Implementados

- **Testes unitários (72% coverage)** — 20 suítes / 79 testes cobrindo services, controllers, repositories, producers, consumers, guards, filters e interceptors
- **Teste de concorrência e2e** — Simula N usuários disputando o mesmo assento simultaneamente via `Promise.allSettled`, valida que exatamente 1 reserva é criada e o restante recebe 409
- **Teste do fluxo completo e2e** — Cobre registro → criação de sessão → reserva → pagamento → histórico, validando todas as transições de estado
- **Rate Limiting** — `ThrottlerGuard` global (60 req/min por IP) via `@nestjs/throttler`
- **Dead Letter Queue** — Consumer dedicado na fila `cinema_events.dlq` que loga mensagens não processáveis (origem, motivo, payload)
- **Retry com exponential backoff** — Decorator `@Retry(maxAttempts, baseDelay)` aplicado em todos os consumers RabbitMQ. Delay calculado como `baseDelay * 2^attempt + jitter`. Após esgotar tentativas, a mensagem é enviada para a DLQ via `nack(msg, false, false)`
- **Evento seat.released** — Publicado quando assentos são liberados (cancelamento ou expiração de reserva), permite integração com notificações e cache
- **Processamento em Batch** — Eventos de expiração são agrupados e enviados em uma única mensagem, reduzindo overhead de comunicação com RabbitMQ
- **Swagger** — Documentação interativa completa em `/api-docs`

## Limitações Conhecidas

- **Precisão da expiração** — O cron roda a cada 10 segundos, então uma reserva pode levar até ~40s para expirar (30s de TTL + 10s do intervalo do cron). Em produção, Redis keyspace notifications ou um scheduler mais granular resolveriam.

## Melhorias Futuras

- **Redis keyspace notifications** — Expiração instantânea de reservas sem depender de polling via cron
- **WebSocket** — Notificar clientes em tempo real sobre mudanças de disponibilidade de assentos
- **Cache layer** — Servir `GET /sessions/:id/seats/available` direto do Redis, invalidando via consumers
- **Métricas** — Prometheus + Grafana para monitorar filas, latência e taxa de erros
