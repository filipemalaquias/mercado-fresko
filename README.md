# Mercado Fresko

Marketplace em React, Vite e Firebase para descobrir produtos locais, gerir lojas e enviar pedidos a comerciantes.

## Funcionalidades

- Catálogo público ligado aos produtos publicados no Firestore, com pesquisa e filtros.
- Contas de cliente e comerciante com autenticação Firebase por e-mail e palavra-passe.
- Configuração da loja e gestão de produtos, imagens e stock pelo comerciante.
- Pedidos por loja, com preço e disponibilidade recalculados no servidor.
- Acompanhamento de pedidos pelo cliente e gestão segura de estados pelo comerciante.
- Área de cliente com catálogo e diretório de lojas, favoritos por conta, edição segura do nome, acompanhamento/cancelamento de pedidos pendentes e perguntas frequentes.
- Carrinho persistente no navegador, incluindo adição rápida a partir da vitrine da conta.
- Programa de afiliados com adesão do cliente, links rastreáveis, comissão por unidade definida pelo comerciante e registo privado de pedidos atribuídos.
- Imagens dos produtos no Firebase Storage e logótipos de lojas no Cloudinary.

Os pedidos não cobram online: o cliente e o comerciante combinam diretamente o pagamento e a entrega ou levantamento. O Appy Pay ainda não está integrado. As comissões de afiliado ficam pendentes até validação futura de pagamento; não existe saldo levantável, recolha de dados bancários ou transferência nesta fase. As comissões de pedidos cancelados são anuladas.

## Dados, permissões e operações

- **Lojas:** o comerciante autenticado cria e edita apenas a loja associada ao seu UID. Lojas configuradas são públicas para consulta; não existe eliminação física da loja.
- **Produtos:** um comerciante com loja configurada pode cadastrar, consultar, editar e eliminar apenas os seus produtos. Os produtos publicados podem ser consultados publicamente; stock e stock mínimo são inteiros entre 0 e 1 000 000. A lista de produtos permite pesquisa e filtros locais sobre a consulta em tempo real.
- **Imagens de produtos:** a leitura é pública; o upload ou substituição exige sessão do dono e um produto já registado que pertença à mesma conta. São aceites JPG, PNG ou WEBP até 5 MB.
- **Encomendas:** são criadas e alteradas através das Cloud Functions, que recalculam preços, verificam stock e autorizam transições. Cliente e comerciante podem consultar apenas os pedidos em que participam. Não existe eliminação física de encomendas, para preservar o histórico.
- **Perfis e comissões:** o cliente consulta o próprio perfil e comissões. A edição do nome e a adesão ao programa de afiliados passam por Cloud Functions; perfis e comissões não podem ser apagados pelo cliente.
- **Favoritos:** cada cliente pode consultar, adicionar e remover apenas os seus favoritos.

As regras do Firestore e do Storage estão em `firestore.rules` e `storage.rules`; operações diretas do SDK continuam limitadas por essas regras, enquanto operações que afetam encomendas e dados privados passam pelo backend. A remoção de um logótipo na configuração limpa a referência pública guardada na loja; a eliminação física do ficheiro no Cloudinary ainda requer uma função de servidor configurada com credenciais privadas do Cloudinary.

## Requisitos

- Node.js 22 ou superior.
- Um projeto Firebase com Authentication (e-mail/palavra-passe), Cloud Firestore, Cloud Storage, Cloud Functions, App Check e Hosting ativados.
- Um site key do reCAPTCHA v3 associado ao domínio no Firebase App Check.
- Um projeto Cloudinary com um preset de upload sem assinatura configurado para imagens JPG, PNG e WEBP, com limite de 5 MB.
- Firebase CLI autenticado e permissões de deploy. A publicação de Cloud Functions pode exigir o plano Blaze.

## Configuração local

1. Copie `.env.example` para `.env` e preencha os valores do projeto Firebase, do reCAPTCHA v3 e do Cloudinary. As variáveis `VITE_*` são incluídas no bundle público: nunca coloque chaves privadas ou segredos nelas.
2. Instale as dependências e inicie o servidor:

   ```sh
   npm install
   npm run dev
   ```

3. No Firebase Console, confirme que o bucket de Storage está criado, o método de autenticação por e-mail e palavra-passe está ativo e o domínio está registado no App Check.
4. No Cloudinary, restrinja o preset sem assinatura aos formatos JPG/PNG/WEBP e a imagens até 5 MB. O preset e o nome da cloud são públicos no navegador; as restrições do preset são parte essencial da proteção contra abuso.
5. Publique as regras Firestore, Storage e Cloud Functions antes de testar o diretório público de lojas, favoritos, afiliados, edição do perfil do cliente ou cancelamento de pedidos pela conta do cliente. As regras novas permitem leitura pública apenas de lojas configuradas; favoritos, comissões e pedidos permanecem limitados às contas autorizadas.

## Validação e publicação

```sh
npm run lint
npm run build
firebase deploy --only firestore:rules,storage,functions,hosting
```

O build Vite é feito antes do deploy do Hosting, com o `.env` de produção disponível no ambiente de build. As Cloud Functions exigem App Check; configure e valide o reCAPTCHA no domínio de produção antes de publicar. Configure também os domínios autorizados no Firebase Authentication e teste registo, recuperação de palavra-passe, uploads, carrinho, criação/cancelamento de pedidos, adesão de afiliado, atribuição de links/comissões, favoritos, atualização do nome e acesso às lojas com contas separadas de cliente e comerciante. Não anuncie levantamentos de comissão até existir validação confiável do pagamento e um processo de payout implementado.

Antes de abrir ao público, acrescente e publique políticas de privacidade e termos revistos para a operação real, configure canais de suporte e verifique os detalhes fiscais, comerciais e de entrega aplicáveis. A aplicação não fornece gateway de pagamento, payout de afiliados, cálculo de entrega, administração de aprovação de comerciantes ou gestão de equipa.
