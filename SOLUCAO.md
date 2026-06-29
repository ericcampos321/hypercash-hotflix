# SOLUCAO.md

## 1. Cadastro cria conta, mas saldo não aparece

### Sintoma observado

Alguns usuários relatavam que o cadastro às vezes dava erro, mas ao tentar entrar novamente a conta existia. Depois disso, o saldo não aparecia corretamente na aplicação.

### Causa raiz

O problema estava no fluxo de cadastro no frontend
Antes da correção, o `handleRegister` no arquivo `apps/web/src/components/AuthForm.tsx` fazia a chamada de cadastro diretamente para a API, salvava apenas `token` e `user` no zustand e redirecionava o usuário para `/dashboard`.

Com isso, o estado `balance` permanecia como `null`. A dashboard dependia desse valor para exibir o saldo, então a conta podia ser criada corretamente, mas a tela abria com o saldo vazio ou inconsistente.

alterei nos dois aquivos:

- `apps/web/src/components/AuthForm.tsx`
- `apps/web/src/stores/useUserStore.ts`

### Correção aplicada

Ajustei o fluxo de cadastro no `useUserStore`, criando a função `register`.

Agora, depois do cadastro com sucesso, o frontend executa a sequência correta que é essa agora:

1 Chama `POST /api/auth/register`.
2 Salva o `token` no store.
3 Busca o saldo em `GET /api/balance`.
4 Salva `user + balance` no Zustand.
5 Redireciona para `/dashboard`.

No `AuthForm.tsx`, o cadastro deixou de chamar `api.post` diretamente e passou a chamar:

```ts
await register(data);
router.push("/dashboard");
```

### Por que essa solução está correta

A dashboard precisa abrir com o estado de usuário e saldo já sincronizados. Já quando busca o saldo logo após o cadastro, o frontend evita renderizar a tela com `balance: null`, mesmo quando o saldo já existe no banco.

### Validação

Foi testado o cadastro de uma nova conta. Após o redirect para a dashboard, o saldo passou a aparecer corretamente, sem ficar vazio ou como `—`.

---

## 2. Saques rápidos permitiam inconsistência no saldo

### Sintoma observado

Usuários conseguiam fazer vários saques rapidamente e o sistema aprovava mais saques do que deveria. Em alguns cenários, isso poderia gerar saldo negativo ou histórico financeiro incompatível com o saldo real.

### Causa raiz

A rota de saque fazia a validação de saldo em memória:

1 Buscava o saldo com `SELECT`.
2 Verificava se havia saldo suficiente no código.
3 Calculava o novo saldo.
4 Atualizava o saldo com `UPDATE`.
5 Criava a transação.

Esse fluxo não era seguro para requisições simultâneas. Duas ou mais requisições podiam ler o mesmo saldo antes de qualquer atualização ser gravada, fazendo com que todas fossem aprovadas.

Arquivo alterado foi esse:

- `apps/api/src/index.ts`

Rota envolvida:

- `POST /api/withdraw`

### Correção aplicada

A correção foi feita no backend, tornando o débito do saque real no banco.

Agora o saldo só é atualizado se, no momento do `UPDATE`, ainda existir saldo suficiente:

```sql
UPDATE balances
SET amount = amount - valor
WHERE user_id = usuario
AND amount >= valor
RETURNING amount
```

### Por que essa solução está correta

A validação deixou de depender de um saldo lido anteriormente em memória. O próprio banco passou a garantir que o saldo só será adicionado se ainda for suficiente no momento do insert da função.
Isso impede que requisições concorrentes aprovem saques acima do saldo disponível.

### Validação

Realizei o teste com saldo inicial de 970,00 e 5 saques simultâneos de 300,00.

Resultado esperado e confirmado:

- 3 saques aprovados.
- 2 saques recusados por saldo insuficiente.
- Saldo final: R$ 70,00.
- Apenas 3 transações de saque foram registradas.

---

## 3. Login podia deixar carregamento preso

### Sintoma observado

Usuários relataram que, ao tentar fazer login, a tela ficava carregando e só voltava ao normal após recarregar a página.

### Causa raiz

O estado `isLoading` do store de autenticação podia ficar preso como `true`.

No `useUserStore`, o login fazia:

1 `set({ isLoading: true })`.
2 Chamava `POST /api/auth/login`.
3 Salvava o token.
4 Chamava `GET /api/balance`.
5 Apenas no final do fluxo success fazia `isLoading: false`.

Se qualquer etapa falhasse, por exemplo erro de rede ou falha ao buscar o saldo, o `isLoading` não era resetado.

Além disso, `isLoading` estava sendo persistido no `localStorage`, mesmo sendo um estado transitório de interface e nao pela logica real...

Arquivo envolvido que alterei foi o

`apps/web/src/stores/useUserStore.ts`

### Correção aplicada

Ajustei os fluxos de `login` e `register` para usarem `try/finally`.

Msmo que alguma chamada falhe, o estado de loading sempre volta para `false`.

Também removi o isLoading do salvamento automático, porque ele serve só para indicar que a tela está carregando naquele momento. Se isso ficasse salvo, o sistema poderia abrir depois parecendo que ainda estava carregando, mesmo sem estar.

### Por que essa solução está correta

Loading é um estado temporário de UI. Ele não deve ser persistido no navegador e precisa ser limpo tanto no sucesso quanto no erro, geralmente nao pode depender 100% de UI.

Com `try/finally`, o reset do loading fica garantido em todos os caminhos do fluxo.

### Validação

Testei os cenários de erro no login, incluindo senha inválida e falha de requisição. O botão voltou ao estado normal e o `localStorage` não persistiu mais `isLoading`.

---

## 4. Checkout com saldo insuficiente redirecionava para login

### Sintoma observado

Ao tentar fazer um pagamento sem saldo suficiente, o usuário era redirecionado para a tela de login.

### Causa raiz

A rota de checkout retornava `401 Unauthorized` quando o saldo era insuficiente.

Esse status HTTP significa falha de autenticação. Como o frontend interpreta respostas `401` como sessão inválida, ele limpava a sessão e redirecionava o usuário para login.

Mas o saldo insuficiente não é erro de autenticação. É erro de regra de negócio, que geralmente é usado.

Arquivo que verifiquei foi o:

`apps/api/src/index.ts`

Rota que era chamada foi a:

- `POST /api/checkout`

### Correção aplicada

Altere o status retornado quando o saldo é insuficiente de `401` para `400`.

codigo que chamava antes:

```ts
return c.json({ error: "Saldo insuficiente" }, 401);
```

e depois do ajuste:

```ts
return c.json({ error: "Saldo insuficiente" }, 400);
```

### Por que essa solução está correta

O usuário continuava autenticado. O problema era apenas não ter saldo para concluir o pagamento.

Retornar `400` evita que o frontend trate o erro como sessão expirada, que 100% deve ficar como responsabilidade que vem do backend, e mantém o usuário logado, exibindo apenas a mensagem de saldo insuficiente.

### Validação

Testei o checkout com saldo menor que o valor da compra. A API passou a retornar erro de regra de negócio, sem redirecionar o usuário para login.

---

## 5. Saldo ficava inconsistente após falha no checkout

### Sintoma observado

Apos uma falha no pagamento, o saldo exibido no topo da página podia ficar diferente ou inconsistente em relação ao saldo correto.

### Causa raiz

O checkout diminuía o saldo na tela antes de confirmar se o pagamento realmente tinha dado certo. Quando a API retornava erro, esse valor não era restaurado corretamente. Por isso, a tela podia mostrar um saldo diferente do saldo real salvo no banco. Usado bastante em polling de chatbot.

No `CheckoutForm`, o saldo era reduzido no Zustand com `setBalance` antes de saber se o pagamento tinha sido aprovado.

Quando a requisição falhava, o código revertia apenas o cache do React Query, mas não restaurava o saldo no Zustand. Como o Header e o Checkout exibem o saldo a partir do Zustand, a UI podia continuar mostrando valor incorreto ali na operação

Arquivo que foi ajustado:

- `apps/web/src/components/CheckoutForm.tsx`

### Correção aplicada

Ajustei o rollback do checkout para guardar também o saldo anterior do Zustand.

No `onMutate`, agora o código mantem o saldo anterior:

```ts
const previousStoreBalance = useUserStore.getState().balance;
```

No `onError`, esse saldo é restaurado:

```ts
if (typeof context?.previousStoreBalance === "number") {
  setBalance(context.previousStoreBalance);
}
```

### Por que essa solução está correta

Se a UI aplica uma atualização otimista, ela precisa restaurar a mesma fonte de estado quando a operação falha.

Como o saldo visível vem do Zustand, o rollback também precisava atualizar o Zustand, não apenas o cache do React Query.

### Validação

Foi testado um cenário em que o checkout falha. O saldo no banco permaneceu correto e, após a correção, o saldo visual no Header e no Checkout voltou para o valor correto.

---

## 6. Checkout enviava payload inválido

### Sintoma observado

Ao tentar pagar pela tela de checkout, a API retornava erro de validação, foi um erro de validação ali de schema e ajustei pra seguir o fluxo correto.

```text
Invalid input: expected string, received undefined
```

### Causa raiz

O backend exige uma `idempotency_key` em formato UUID no payload do checkout.

Schema exigia

```ts
idempotency_key: z.string().uuid("Chave de idempotência inválida");
```

Mas o frontend enviava um objeto vazio

```ts
api.post("/api/checkout", {});
```

Com isso, a requisição era rejeitada antes mesmo de processar o pagamento.

Arquivos que envolvia esse erro era :

- `apps/api/src/schemas.ts`
- `apps/web/src/components/CheckoutForm.tsx`

### Correção aplicada

Ajustei o frontend para gerar e enviar uma chave de idempotência validaa em cada tentativa de checkout:

```ts
api.post("/api/checkout", {
  idempotency_key: crypto.randomUUID(),
});
```

### Por que essa solução está correta

A API já tinha uma regra clara exigindo uma chave UUDI. O frontend precisava cumprir esse contrato.

Com `crypto.randomUUID()`, cada tentativa de checkout passa a enviar uma chave valida, permitindo que o backend valide e processe a requisição corretamente.

### Validação

Após a correção, o payload do checkout passou a incluir `idempotency_key` em formato UUID. A API deixou de retornar erro de validação por campo ausente.

---

## Resumo final

As correções foram separadas por responsabilidade:

- Cadastro passou a hidratar saldo antes de abrir a dashboard.
- Saque passou a usar débito atômico no banco para evitar concorrência incorreta.
- Login e cadastro passaram a resetar loading corretamente.
- Checkout deixou de retornar `401` para erro de saldo insuficiente.
- Checkout passou a restaurar o saldo visual quando a requisição falha.
- Checkout passou a enviar `idempotency_key` válida para a API.
