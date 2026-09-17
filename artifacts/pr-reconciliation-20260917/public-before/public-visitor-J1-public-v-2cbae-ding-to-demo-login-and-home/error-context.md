# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e4]:
      - heading "Bem-vindo ao EDUCA" [level=1] [ref=e5]
      - paragraph [ref=e6]: O sistema que simplifica a gestão escolar da rede municipal.
    - generic [ref=e8]:
      - img "EDUCA" [ref=e10]
      - heading "Entrar no sistema" [level=2] [ref=e11]
      - paragraph [ref=e12]: Digite suas credenciais para acessar
      - link "Voltar ao início" [ref=e13] [cursor=pointer]:
        - /url: /
      - generic [ref=e14]:
        - generic [ref=e15]:
          - text: E-mail
          - textbox "E-mail" [ref=e16]:
            - /placeholder: [EMAIL REDACTED]
        - generic [ref=e17]:
          - text: Senha
          - textbox "Senha" [ref=e18]:
            - /placeholder: "********"
        - generic [ref=e19]:
          - generic [ref=e20] [cursor=pointer]:
            - checkbox "Manter conectado" [checked] [ref=e21]:
              - generic:
                - img
            - checkbox [checked]
            - generic [ref=e22]: Manter conectado
          - link "Esqueci minha senha" [ref=e23] [cursor=pointer]:
            - /url: /reset-password
        - button "Entrar" [ref=e24] [cursor=pointer]:
          - text: Entrar
          - img [ref=e25]
        - button "Preencher credenciais demo" [active] [ref=e28] [cursor=pointer]
      - paragraph [ref=e29]: Secretaria Municipal de Educação
  - region "Notifications alt+T"
```