# Instalar o dashboard como aplicativo

O PWA é o dashboard de chamados. O agente Windows é um produto separado. O dashboard
instalado usa o mesmo servidor, as mesmas permissões e o mesmo login do admin-console.

## Instalação

- Windows: entre no dashboard pelo Edge ou Chrome e use a opção de instalar aplicativo no
  menu do navegador ou na barra de endereço.
- Android: entre pelo Chrome e use **Instalar aplicativo**, ou **Adicionar à tela inicial →
  Instalar**, conforme a versão do navegador.
- iPhone/iPad: entre pelo Safari, abra **Compartilhar → Adicionar à Tela de Início** e mantenha
  **Abrir como App da Web** ativo quando essa opção aparecer.

No iOS/iPadOS 17.2 ou mais recente, os cookies existentes são copiados na criação do app.
Faça o login antes de adicioná-lo à tela inicial. Depois da instalação, o armazenamento do
PWA é separado do navegador; novos logins no Safari não são sincronizados continuamente.

## Autenticação e Traefik

O dashboard não tem tela de login. Sem sessão, a navegação recebe `302` do forwardAuth para
o admin-console com o endereço de retorno em `rd`. O admin-console grava cookies HttpOnly,
Secure e SameSite=Lax para o domínio pai, e navega de volta ao endereço validado pelo servidor.
Requisições de API sem sessão recebem `401`, em vez do HTML do login.

O manifesto é solicitado com `crossorigin="use-credentials"`, pois navegadores não enviam
cookies no carregamento padrão de um manifesto, mesmo na mesma origem. Isso permite manter
o manifesto atrás do forwardAuth para pessoas já autenticadas. Os ícones e o service worker
usam a mesma origem do dashboard. Não é necessário remover a autenticação do dashboard/API.
Se houver um roteador público para metadados e ícones, limite-o a caminhos estáticos exatos.

O `scope: "/"` cobre apenas o host do dashboard. Outro subdomínio, como o admin-console,
continua fora desse escopo. O navegador pode mostrar uma barra ou uma camada de navegação
durante o login. Não é possível incluir outro host ampliando apenas o `scope`.

No iOS, a camada de navegação externa pode usar armazenamento separado. O fluxo atual usa
cookies compartilhados por domínio, sem uma troca de código no retorno; por isso o novo
login dentro do PWA instalado precisa ser validado em aparelho, inclusive após a expiração
da sessão. A cópia inicial dos cookies não comprova que esse segundo login funcionará.

## Conexão e atualizações

O service worker encaminha navegações ao servidor e guarda somente a página estática de
falta de conexão. HTML do dashboard, respostas da API e dados pessoais não entram no cache.
Respostas de autenticação e erros HTTP são preservados. O aviso offline aparece apenas se
a requisição de navegação falhar por falta de rede; ele não permite consultar ou gravar chamados.

O app passa a usar a versão publicada ao carregar suas páginas novamente. Ele não força um
recarregamento enquanto alguém está preenchendo um formulário. O manifesto oferece o
`favicon.svg` quadrado da marca como ícone vetorial (`sizes: "any"`), além dos PNGs comuns e
maskable de 192/512 pixels e do apple-touch-icon vindos de `brand/logo/web`. O navegador
escolhe o formato suportado; os PNGs continuam disponíveis para plataformas que precisam
deles, incluindo o apple-touch-icon do iPhone/iPad. A atualização de um ícone já instalado
depende do navegador e pode exigir reinstalar o PWA para aparecer imediatamente.

## Conferência após publicar

1. Em uma sessão autenticada, abra **Application → Manifest** no DevTools do Chrome. Confirme
   que o manifesto e os ícones carregam, e que `/service-worker.js` é registrado sem erros.
2. Instale o dashboard, abra pelo ícone e confirme a janela independente do navegador.
3. Faça um novo login com uma conta de teste dentro do app instalado. Confirme o retorno ao
   dashboard, uma requisição autenticada a `/api/auth/me` e a persistência ao fechar e reabrir.
4. Repita o passo anterior no iPhone, tanto com instalação já autenticada quanto após expirar
   a sessão. Safari/WebKit de desktop e emulação de tela não substituem o app da Tela de Início.
5. Sem conexão, recarregue: deve aparecer o aviso offline. Reconecte e use **Tentar novamente**.

Já foi reproduzida no Chrome uma requisição de manifesto protegida: sem `use-credentials`
o cookie era omitido e a resposta era `401`; com o atributo, a resposta era `200`. Em produção,
foi conferido o redirecionamento até o formulário do admin-console e o cookie de retorno nos
dois subdomínios. Isso não constitui validação do login completo no iOS instalado.

## Referências

- [Google: manifesto e credenciais](https://web.dev/articles/add-manifest).
- [Google: navegação e autenticação em PWAs](https://web.dev/learn/pwa/windows).
- [Apple: cópia de cookies no iOS 17.2](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).
- [Apple: escopo e navegação dos apps web](https://developer.apple.com/videos/play/wwdc2023/10120/).
