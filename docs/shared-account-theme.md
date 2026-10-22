# Perfil, saída e tema compartilhado

A preferência de tema usa o cookie `azuos-theme=light|dark`, com `Path=/`,
`Max-Age=31536000`, `SameSite=Lax` e `Secure` em HTTPS. Em `*.grupoazuos.com.br`,
o domínio é `grupoazuos.com.br`, incluindo os sistemas de homologação. Assim a
mesma escolha vale em todos eles, neste navegador. Em localhost e IPs o cookie
fica restrito ao host. Cookies não são compartilhados entre domínios raiz diferentes.

Sem preferência, o tema inicial é escuro. Uma preferência antiga no localStorage
é migrada; um cookie válido sempre tem prioridade sobre ela. A leitura antes da
primeira pintura evita a abertura no tema errado. Abas já abertas sincronizam ao
receber foco, voltar do histórico, ficar visíveis e a cada dois segundos enquanto
visíveis. Cookies ou localStorage bloqueados não impedem alternar o tema na aba.

As cores claras e escuras vêm dos tokens de `chamados`. A tela `/profile` reúne
identidade, dados da conta e aparência. Os campos de organização só aparecem
quando a identidade existente os fornece. O perfil do chamados mantém seu desenho
e suas funções. O admin-console preserva os formulários de edição, foto e senha,
e continua aceitando `/account` como endereço anterior.

O botão **Sair** pede `POST /api/auth/logout`, com JSON e credenciais, ao
admin-console. A sessão é revogada e seus cookies HttpOnly são removidos pelo
provedor. Só após o sucesso o sistema cancela consultas, limpa o cache de dados
e encaminha para o login. Falha mantém a tela e oferece tentar novamente.
O chamados mantém o encaminhamento de logout que já existia na sua API.

## Configuração

Nos domínios do grupo, o endereço da conta é automático: `admin-console.grupoazuos.com.br`
ou `admin-console.homo.grupoazuos.com.br`. Em desenvolvimento, `http://localhost:5000`.
Para instalações diferentes, configure no build do client:

```dotenv
VITE_ACCOUNT_URL=https://admin-console.suaempresa.com.br
VITE_THEME_COOKIE_DOMAIN=.suaempresa.com.br
```

Todos os sistemas devem usar o mesmo domínio de tema. `VITE_ACCOUNT_URL` é um
endereço público, nunca um token ou endereço interno do Docker. O CORS do
admin-console permite apenas o logout JSON aos sistemas dentro de `COOKIE_DOMAIN`;
as demais escritas de conta e administração continuam restritas à origem do console.
Publique o admin-console com essa permissão antes dos demais sistemas.

A API `public-api` não possui interface de usuário; não recebe perfil, botão ou tema.
