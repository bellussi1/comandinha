# Restaurante Virtual - Menu Autoatendimento

Este é um projeto de um sistema de autoatendimento para um restaurante virtual, construído utilizando **Next.js**, **React**, e **Tailwind CSS**. O objetivo do sistema é permitir que clientes façam pedidos de maneira rápida e intuitiva diretamente na tela, escolhendo entre pratos principais e bebidas.

## Tecnologias Utilizadas

- **Next.js** - Framework React para desenvolvimento de aplicações server-side e estáticas.
- **React** - Biblioteca JavaScript para construção de interfaces de usuário.
- **Tailwind CSS** - Framework de CSS utilitário para estilização rápida e personalizada.
- **Lucide-react** - Ícones para uso em componentes interativos.

## Funcionalidades

- Tela de boas-vindas para introdução do restaurante e início do pedido.
- Menu interativo com categorias de pratos e bebidas.
- Adicionar e remover itens do carrinho com atualização em tempo real do total.
- Confirmação do pedido com feedback visual para o usuário.
- Persistência do layout principal, facilitando a navegação e acessibilidade.

## Estrutura de Componentes

- **MenuAutoatendimento**: Componente principal que gerencia o menu, o carrinho e a confirmação de pedidos.
- **TelaBoasVindas**: Componente de boas-vindas para apresentar o restaurante.
- **ConfirmacaoPedido**: Componente de modal que confirma visualmente o pedido ao usuário.

## Como Executar o Projeto

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/bellussi1/menu-system.git
   cd menu-system
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

4. **Acesse o projeto**: 
   Abra o navegador e vá para [http://localhost:3000](http://localhost:3000).

## Organização dos Arquivos

- **/components**: Contém os componentes React do projeto, incluindo `MenuAutoatendimento`, `TelaBoasVindas` e `ConfirmacaoPedido`.
- **/pages**: Inclui o arquivo `page.js`, responsável por renderizar o componente `MenuAutoatendimento` como página inicial.
- **/styles**: Contém os arquivos de configuração do Tailwind e estilos globais (caso haja).

## Melhorias Futuras

- Adicionar a persistência do carrinho para evitar a perda de itens ao atualizar a página.
- Implementar animações adicionais para uma experiência de usuário mais rica.
- Integrar com um backend para processar e armazenar pedidos.
- Adicionar testes unitários e de integração.

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para abrir uma _issue_ ou enviar um _pull request_.

1. **Fork o repositório**
2. **Crie uma branch para sua feature**:
   ```bash
   git checkout -b feature/nova-feature
   ```
3. **Faça o commit das suas mudanças**:
   ```bash
   git commit -m "Adiciona nova funcionalidade"
   ```
4. **Push para a branch**:
   ```bash
   git push origin feature/nova-feature
   ```
5. **Abra um Pull Request**

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
