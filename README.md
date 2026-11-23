# PratoCerto Ops — MVP de Recuperação Operacional

Protótipo interativo desenvolvido para a disciplina de **Gestão de Produtos & Engenharia de Produção**, apresentando uma solução operacional e tecnológica para o estudo de caso **O Lançamento do PratoCerto**.

🔗 **Acesse o MVP ao vivo:** [Clique aqui para abrir o protótipo](COLOQUE_SEU_LINK_AQUI)

---

## 👥 Integrantes do Grupo
* **Eduardo Henrique**
* **Lindolfo Sampaio**
* **Victor Lima**

---

## 📌 Contexto e Diagnóstico do Caso
Após uma divulgação espontânea de um influenciador digital, o aplicativo PratoCerto recebeu um pico inesperado de demanda que expôs falhas combinadas (tecnológicas e operacionais):

* **Venda sem estoque:** 760 pedidos confirmados nas primeiras 4 horas para um estoque físico real de apenas 500 refeições (260 pedidos vendidos sem disponibilidade).
* **Gargalos em cascata:**
  * **IA / Catálogo:** 650 solicitações/h (capacidade de 500/h)
  * **Cozinha:** ~190 pedidos/h (capacidade de 100/h)
  * **Embalagem:** capacidade de 80 pedidos/h
  * **Entregadores (Gargalo Crítico):** capacidade máxima de 50 entregas/h
  * **Atendimento ao Cliente (SAC):** capacidade de 30 chamados/h

---

## 🎯 As 3 Ações Prioritárias Implementadas no MVP
O protótipo traduz diretamente as três decisões estratégicas escolhidas pelo grupo:

1. **Retirar itens sem estoque:** integração em tempo real entre o estoque físico da cozinha e o cardápio do aplicativo, bloqueando automaticamente pratos zerados com o selo `ESGOTADO`.
2. **Limitar novos pedidos (Slotting):** controle de capacidade por janela horária para nivelar a demanda de entrada ao teto real da operação.
3. **Contratar entregadores temporários:** simulador de expansão da frota (de 50/h até 120/h), demonstrando inclusive o **efeito cascata** quando a frota ultrapassa 80/h e o gargalo migra para a Embalagem.

---

## 🖥️ Funcionalidades do Protótipo
O MVP foi organizado em 4 módulos interativos:

| Módulo | O que demonstra na apresentação |
| :--- | :--- |
| **1. Central ao Vivo (OMS)** | Fluxograma horizontal da cadeia de valor, alternância instantânea entre **Crise**, **MVP Ativo** e **Estresse +50%**, painel das 3 ações prioritárias, status das integrações essenciais e log de eventos. |
| **2. App & Estoque** | Simulação lado a lado do estoque físico da cozinha sincronizado com o **App do Cliente**, teste de venda sem estoque, controle de janela de *slotting* e alertas automáticos de entrega. |
| **3. Indicadores & Estresse** | Teste de estresse com demanda 50% maior (285 pedidos/h), monitor crítico do **Gateway de Pagamentos (limite de 300/h)** e comparativo dos KPIs de recuperação. |
| **4. Roteiro do Pitch** | Divisão da apresentação por integrante (Lindolfo, Eduardo e Victor), tese final do grupo e cronômetro integrado de 2 minutos. |

---

## 📊 Indicadores de Recuperação Monitorados
* Tempo médio de entrega
* Entregas realizadas no prazo
* Fila de embalagem
* Produtos vendidos sem estoque
* Pagamentos não confirmados
* Volume de reclamações (SAC)

---

## 🛠️ Tecnologias Utilizadas
Projeto construído em **HTML5**, **CSS3** e **JavaScript (Vanilla)** puro, sem dependências externas, garantindo execução instantânea em qualquer navegador.

```text
pratocerto-mvp/
├── index.html   # Estrutura das 4 abas e componentes da interface
├── style.css    # Estilização responsiva, modo escuro e layout de impressão
├── script.js    # Motor de cálculo de gargalos, simulador de estresse e interações
└── README.md    # Documentação do projeto
