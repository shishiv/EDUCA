[Issue canônica #248](https://github.com/shishiv/EDUCA/issues/248) | [Verificações e capturas](https://github.com/shishiv/EDUCA/blob/fm/educa-demo-prefill-248/artifacts/demo-prefill-248/report.md)

## Why the change

A entrada demo deve abrir com e-mail e senha já preenchidos para permitir experimentar o EDUCA sem procurar credenciais nem autenticar automaticamente.

## Special things to note

- Só `NEXT_PUBLIC_DEMO_SANDBOX=true` ativa o preenchimento; o fallback privado não ativa a interface e nenhuma variável remota foi alterada.
- Typecheck, lint sem warnings, build e 1374 testes passaram, com 29 skips existentes; a jornada `public-visitor` passou nos dois modos com 1 worker, incluindo flag pública desligada e fallback privado ligado.
- Conta pública, login bem-sucedido e dashboard não foram validados; não há deploy, mudança de seed ou alteração na landing e em `/demo`.

## Change outline

```diff
 /login
-  dois campos vazios → clique em “Preencher” → credenciais demo
+  helper único lê a flag pública
+    true  → estado inicial com a persona demo existente
+    outro → estado inicial vazio, entrada operacional
+  convite antes dos campos, cuidados junto de “Entrar”

 “Preencher credenciais demo” → restaura os campos, sem sessão
 “Entrar” → envia os valores atuais pelo fluxo de autenticação existente
```

```text
 Prova existente: landing → /demo → /login → início
   demo ligado    → valores exatos antes do clique, ação visível em 390×844
   editar/preencher → valores restaurados, zero pedidos de autenticação
   demo desligado → dois campos vazios, “Entrar” preservado

 Componente com AuthProvider real
   envio explícito → loading → rejeição do Auth → formulário disponível
```
