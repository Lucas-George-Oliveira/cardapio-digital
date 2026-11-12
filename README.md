# Manual Técnico de Implantação e Operação

**Sistema de Cardápio Digital e KDS**

---

## 1. Requisitos de Hardware e Rede

Para garantir a estabilidade do sistema em horário de pico (alta concorrência de requisições via WebSocket), a infraestrutura básica do restaurante deve seguir os parâmetros abaixo:

- **Servidor Local (Host):**
  - Processador: Intel Core i3 (8ª geração) ou Ryzen 3 / superior.
  - Memória RAM: 8GB mínimo.
  - Armazenamento: SSD de 128GB (para leitura rápida do banco de dados SQLite/Prisma).
  - Sistema Operacional: Windows 10/11 Pro ou Ubuntu Linux 22.04 LTS.
- **Rede e Wi-Fi:**
  - **Roteador Dedicado:** O roteador que atende os tablets **não deve** ser o mesmo que fornece Wi-Fi aos clientes do restaurante. Utilize um roteador Dual-Band (5GHz preferencialmente para os tablets para evitar interferência).
  - **IP Fixo (Reserva de DHCP):** O computador Servidor deve ser configurado no roteador com um IP Fixo local (ex: `192.168.1.100`). Isso garante que os tablets sempre encontrem o servidor, mesmo após quedas de energia.

## 2. Passo a Passo de Instalação do Servidor

1.  **Preparação do Ambiente:**
    - Instale o [Node.js](https://nodejs.org/) (versão LTS).
    - Clone ou copie os arquivos do sistema para o diretório `C:\Sistemas\CardapioDigital`.
2.  **Configuração de Firewall (Windows):**
    - Abra o "Windows Defender Firewall" > Configurações Avançadas > Regras de Entrada.
    - Crie uma Nova Regra de Porta: TCP, Portas Locais Específicas: `3000` (Backend/WebSocket) e `5173` (Frontend).
    - Permita a conexão em redes Privadas.
3.  **Automação de Inicialização (PM2):**
    Para garantir que o sistema inicie sozinho caso o computador reinicie, utilize o PM2:
    ```bash
    npm install -g pm2
    pm2 start backend/src/server.js --name "cardapio-backend"
    pm2 start "npm run dev" --name "cardapio-frontend" --cwd ./frontend
    pm2 save
    pm2 startup
    ```

## 3. Provisionamento dos Tablets (Modo Kiosk)

Para evitar que os clientes saiam do cardápio e mexam no sistema Android do tablet, utilize o aplicativo **Fully Kiosk Browser**.

1.  **Configurações do Android:**
    - Desative o brilho automático e fixe em 70-80%.
    - Vá em Configurações > Tela > Tempo limite da tela: **Nunca desligar** (ou 30 minutos).
    - Desative as atualizações automáticas do sistema operacional e da Play Store.
2.  **Configuração do Fully Kiosk Browser:**
    - URL Inicial: `http://[IP_DO_SERVIDOR]:5173`
    - Ative o **Kiosk Mode** (exigirá permissões de administrador do dispositivo).
    - Desative a barra de status, barra de navegação inferior e bloqueie o botão de volume.
3.  **Vínculo com a Mesa:**
    - Ao abrir o sistema pela primeira vez no tablet, a tela de configuração solicitará o PIN Administrativo (`1234`) e o Número da Mesa. Após inseridos, o tablet está travado e pronto para o cliente.

## 4. Guia Rápido de Operação (Para a Equipe)

Este guia deve ser fixado próximo ao computador do Caixa/Balcão.

- **Entendendo o Mapa do Salão:**
  - **Verde (Online):** Mesa ocupada e sistema ativo.
  - **Amarelo (Pisca):** Cliente está chamando o garçom. Envie o atendente e clique em "Atendido" para liberar o tablet do cliente.
  - **Vermelho (Pisca):** Cliente pediu a conta. O extrato detalhado aparecerá na tela. Após receber o pagamento, clique em "Encerrar Mesa" para zerar a comanda e liberar para o próximo cliente.
- **Gestão de Pedidos (KDS da Cozinha):**
  - Pedidos novos chegam acompanhados de um **aviso sonoro** (certifique-se de que o botão "Ativar Áudio" está ligado no menu esquerdo).
  - Clique em **Iniciar Preparo** (botão azul) assim que o prato for para o fogo.
  - Clique em **Marcar Entregue** (botão verde) somente após o garçom levar o prato à mesa. O ticket sumirá da tela em 2 segundos.
- **Acabou um Produto no Estoque?**
  - Vá na aba "Cardápio / Estoque", encontre o produto esgotado e clique no interruptor (verde para cinza). O produto sumirá imediatamente da tela de todos os clientes no salão.

## 5. Checklist de Entrega e Troubleshooting

**Checklist de Entrega (Pre-flight):**

- [ ] IP do servidor está fixado no roteador?
- [ ] Firewall do Windows está com as portas 3000 e 5173 liberadas?
- [ ] Tablets estão na rede Wi-Fi exclusiva?
- [ ] Tablets bloqueados via Fully Kiosk Browser?
- [ ] Teste de ponta a ponta realizado (Mesa faz pedido > KDS aceita > Mesa pede conta > Balcão encerra)?

**Troubleshooting Rápido (Resolução de Problemas):**

- **Problema:** _Tablet exibe barra vermelha "Sem conexão com o restaurante"._
  - **Solução:** Verifique se o Wi-Fi do tablet desconectou. Verifique se o servidor não mudou de IP local ou se foi desligado. O tablet reconectará e sincronizará automaticamente quando o Wi-Fi voltar.
- **Problema:** _Som de alerta não toca no balcão quando chega pedido._
  - **Solução:** Navegadores bloqueiam áudio automático. O operador do Caixa deve clicar explicitamente no botão "Ativar Áudio" (ícone de alto-falante) no menu esquerdo do painel Gestor ao iniciar o turno.
- **Problema:** _Produto aparece riscado/cinza no tablet do cliente._
  - **Solução:** O produto foi pausado no painel de Estoque. Reative-o pela aba "Cardápio / Estoque" no Balcão.
