// ===== ESTADO GLOBAL DO MVP =====
const state = {
  scenario: "mvp", // "crise" | "mvp" | "estresse"
  stockSync: true,
  slotting: true,
  slotCap: 80,
  fleetCap: 80,
  windowUsed: 74,
  orderStep: 0,
  stockoutEvents: 0,
  dishes: [
    { id: 1, name: "Salmão com Quinoa", price: "R$ 38,90", qty: 0 },
    { id: 2, name: "Frango Grelhado Fit", price: "R$ 29,90", qty: 24 },
    { id: 3, name: "Bowl Vegetariano", price: "R$ 27,50", qty: 18 },
    { id: 4, name: "Patinho com Purê", price: "R$ 32,00", qty: 12 }
  ]
};

const trackerMessages = [
  'Alerta enviado ao cliente: "Seu pedido #PC-409 foi confirmado com prazo real calculado."',
  'Alerta enviado ao cliente: "Seu prato entrou em preparo na cozinha PratoCerto."',
  'Alerta enviado ao cliente: "Refeição pronta! Passando pela conferência e embalagem térmica."',
  'Alerta enviado ao cliente: "Entregador a caminho! Acompanhe o trajeto em tempo real."',
  'Alerta enviado ao cliente: "Pedido entregue dentro do prazo. Bom apetite!"'
];

// ===== UTILITÁRIOS DE LOG =====
function addLog(msg) {
  const logEl = document.getElementById("eventLog");
  const now = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  const line = document.createElement("div");
  line.className = "log-line";
  line.innerHTML = `<span>[${now}]</span>${msg}`;
  logEl.prepend(line);
}

// ===== CÁLCULO OPERACIONAL =====
function computeMetrics() {
  const rawDemand = state.scenario === "estresse" ? 285 : 190;
  const effectiveDemand = state.slotting ? Math.min(rawDemand, state.slotCap) : rawDemand;

  const stages = [
    { id: "ia", name: "IA / Catálogo", cap: 500, load: state.scenario === "estresse" ? 975 : (state.slotting ? effectiveDemand * 3.2 : 650) },
    { id: "pay", name: "Pagamentos", cap: 300, load: effectiveDemand },
    { id: "kitchen", name: "Cozinha", cap: 100, load: effectiveDemand },
    { id: "pack", name: "Embalagem", cap: 80, load: effectiveDemand },
    { id: "fleet", name: "Entregadores", cap: state.fleetCap, load: effectiveDemand }
  ];

  // Gargalo físico real (menor capacidade entre Cozinha, Embalagem e Entregadores)
  const physical = stages.slice(2);
  let bottleneck = physical[0];
  physical.forEach((s) => {
    if (s.cap < bottleneck.cap) bottleneck = s;
  });

  const throughput = Math.min(effectiveDemand, bottleneck.cap);
  const backlogPerHour = Math.max(0, effectiveDemand - throughput);

  // Vendas sem estoque (na crise foram 260 em 4h)
  const stockout = state.stockSync ? 0 : (state.scenario === "estresse" ? 390 : 260) + state.stockoutEvents;

  // Prazo médio estimado
  let eta = 28 + Math.round((backlogPerHour / Math.max(1, throughput)) * 42);
  if (state.scenario === "crise") eta = 98;
  if (state.scenario === "estresse" && !state.slotting) eta = 135;

  // Entregas no prazo (%)
  const onTime = Math.max(18, Math.min(97, Math.round(96 - (backlogPerHour / Math.max(1, effectiveDemand)) * 75)));

  // Fila de embalagem
  const packQueue = Math.max(0, Math.min(effectiveDemand, 100) - Math.min(80, state.fleetCap));

  // Pagamentos não confirmados (%)
  const payPct = Math.round((effectiveDemand / 300) * 100);
  const payFail = payPct >= 90 ? 18.4 : (!state.stockSync ? 11.2 : 0.8);

  // Reclamações no SAC (capacidade 30/h)
  const sacLoad = state.stockSync && backlogPerHour === 0 ? 12 : Math.min(180, Math.round(25 + backlogPerHour * 0.9 + (stockout > 0 ? 45 : 0)));

  return {
    rawDemand,
    effectiveDemand,
    stages,
    bottleneck,
    throughput,
    backlogPerHour,
    stockout,
    eta,
    onTime,
    packQueue,
    payPct,
    payFail,
    sacLoad
  };
}

// ===== RENDERIZAÇÃO COMPLETA =====
function renderAll() {
  const m = computeMetrics();

  // 1. Faixa de Status
  const strip = document.getElementById("statusStrip");
  const pill = document.getElementById("scenarioPill");
  const summary = document.getElementById("statusSummary");

  strip.className = "status-strip";
  pill.className = "pill";

  if (state.scenario === "crise") {
    strip.classList.add("state-crise");
    pill.classList.add("danger");
    pill.textContent = "CENÁRIO DE CRISE (CASO ORIGINAL)";
    summary.textContent = "760 pedidos confirmados em 4h para 500 refeições. Sem sincronização de estoque e frota travada em 50/h.";
  } else if (state.scenario === "estresse") {
    strip.classList.add("state-estresse");
    pill.classList.add("warn");
    pill.textContent = "TESTE DE ESTRESSE (+50% · 285/H)";
    summary.textContent = state.slotting
      ? "Pico de 285/h contido pelo Slotting. Desative a Ação 2 para ver a falha imediata da frota e o Gateway em 95%."
      : "Colapso em cascata! Frota, Embalagem e Cozinha saturadas e Gateway de Pagamentos a 95% do limite (285/300).";
  } else {
    pill.textContent = "MODO MVP ATIVO";
    summary.textContent = "Operação estabilizada: estoque sincronizado, entrada nivelada por slotting e frota reforçada.";
  }

  // 2. Fluxograma
  const pipeEl = document.getElementById("pipelineStages");
  pipeEl.innerHTML = "";
  m.stages.forEach((s) => {
    const pct = Math.min(100, Math.round((s.load / s.cap) * 100));
    const isBottleneck = s.id === m.bottleneck.id && m.effectiveDemand >= s.cap;
    const isOver = s.load > s.cap;
    const barClass = isOver || pct >= 90 ? "danger" : pct >= 75 ? "warn" : "";

    const card = document.createElement("div");
    card.className = `stage-card ${isBottleneck ? "bottleneck" : isOver ? "warning" : ""}`;
    card.innerHTML = `
      <div class="stage-tag">${isBottleneck ? "GARGALO ATIVO" : isOver ? "SOBRECARGA" : "OPERANDO"}</div>
      <div class="stage-title">${s.name}</div>
      <div class="stage-metric">${Math.round(s.load)} / ${s.cap} h</div>
      <div class="bar-track"><div class="bar-fill ${barClass}" style="width:${pct}%"></div></div>
      <div class="stage-note">${isOver ? `Fila: +${Math.round(s.load - s.cap)}/h` : `Uso: ${pct}% da capacidade`}</div>
    `;
    pipeEl.appendChild(card);
  });

  // Cartão SAC
  const sacPct = Math.min(100, Math.round((m.sacLoad / 30) * 100));
  document.getElementById("sacMetric").textContent = `${m.sacLoad} / 30 h`;
  const sacBar = document.getElementById("sacBar");
  sacBar.style.width = `${sacPct}%`;
  sacBar.className = `bar-fill ${m.sacLoad > 30 ? "danger" : m.sacLoad > 22 ? "warn" : ""}`;
  document.getElementById("sacNote").textContent = m.sacLoad > 30 ? "SAC colapsado por atrasos/estornos" : "Chamados sob controle";

  // Alerta de Efeito Cascata
  const cascadeAlert = document.getElementById("cascadeAlert");
  const cascadeBadge = document.getElementById("cascadeBadge");
  if (state.fleetCap > 80) {
    cascadeAlert.classList.remove("hidden");
    cascadeAlert.textContent = `Efeito Cascata detectado: a frota subiu para ${state.fleetCap}/h e deixou de ser o limite. O gargalo migrou para a Embalagem (80/h).`;
    cascadeBadge.className = "badge warn";
    cascadeBadge.textContent = "Gargalo migrou: Embalagem (80/h)";
  } else if (m.backlogPerHour > 0) {
    cascadeAlert.classList.add("hidden");
    cascadeBadge.className = "badge danger";
    cascadeBadge.textContent = `Gargalo ativo: ${m.bottleneck.name} (${m.bottleneck.cap}/h)`;
  } else {
    cascadeAlert.classList.add("hidden");
    cascadeBadge.className = "badge";
    cascadeBadge.textContent = "Fluxo equilibrado";
  }

  // 3. KPIs Horizontais
  document.getElementById("kpiDemand").textContent = `${m.effectiveDemand} /h`;
  document.getElementById("kpiDemandSub").textContent = state.slotting ? `Demanda bruta: ${m.rawDemand}/h` : "Sem limite de entrada";
  document.getElementById("kpiThroughput").textContent = `${m.throughput} /h`;
  document.getElementById("kpiThroughputSub").textContent = `Teto atual: ${m.bottleneck.name} (${m.bottleneck.cap}/h)`;
  document.getElementById("kpiStockout").textContent = `${m.stockout}`;
  document.getElementById("kpiStockoutSub").textContent = state.stockSync ? "Bloqueio automático ativo" : "Risco de venda sem estoque!";
  document.getElementById("kpiEta").textContent = `${m.eta} min`;
  document.getElementById("kpiEtaSub").textContent = m.eta <= 35 ? "Dentro da meta (≤ 35 min)" : "Acima do prazo prometido";

  // 4. Tabela de Integrações
  const intRows = [
    { name: "Estoque Físico ↔ App", fn: "Retira itens zerados do cardápio em tempo real", ok: state.stockSync },
    { name: "Gateway Pagamentos ↔ OMS", fn: "Valida transação sem duplicidade e monitora teto 300/h", ok: m.payPct < 90 },
    { name: "Despacho Logístico em Tempo Real", fn: "Roteiriza frota e envia alertas automáticos ao cliente", ok: state.fleetCap >= 75 && m.backlogPerHour === 0 }
  ];
  document.getElementById("integrationsBody").innerHTML = intRows
    .map(
      (r) => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td class="muted">${r.fn}</td>
        <td><span class="badge ${r.ok ? "" : "danger"}">${r.ok ? "Ativa" : "Falha / Crítica"}</span></td>
      </tr>`
    )
    .join("");

  // 5. Labels dos sliders
  document.getElementById("slotCapLabel").textContent = `${state.slotCap} /h`;
  document.getElementById("fleetCapLabel").textContent = `${state.fleetCap} /h`;
  document.getElementById("slotCapRange").disabled = !state.slotting;

  // 6. Aba App & Estoque
  renderKitchenAndPhone(m);

  // 7. Aba Indicadores & Estresse
  renderIndicators(m);
}

function renderKitchenAndPhone(m) {
  const syncBadge = document.getElementById("syncStatusBadge");
  syncBadge.className = `badge ${state.stockSync ? "" : "danger"}`;
  syncBadge.textContent = state.stockSync ? "Sincronizado com App" : "Dessincronizado (Crise)";

  // Lista da cozinha
  const kList = document.getElementById("kitchenStockList");
  kList.innerHTML = state.dishes
    .map(
      (d) => `
      <div class="stock-item">
        <div>
          <strong>${d.name}</strong>
          <div class="small muted">${d.qty === 0 ? "Estoque zerado na cozinha" : `${d.qty} porções disponíveis`}</div>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeDishQty(${d.id}, -1)">-</button>
          <strong>${d.qty}</strong>
          <button class="qty-btn" onclick="changeDishQty(${d.id}, 1)">+</button>
        </div>
      </div>`
    )
    .join("");

  // Janela de Slotting
  const cap = state.slotting ? state.slotCap : 190;
  const pct = Math.min(100, Math.round((state.windowUsed / cap) * 100));
  const isFull = state.slotting && state.windowUsed >= cap;
  document.getElementById("windowUsageText").textContent = `${state.windowUsed} / ${cap} vagas`;
  const wBar = document.getElementById("windowBar");
  wBar.style.width = `${pct}%`;
  wBar.className = `bar-fill ${isFull ? "danger" : pct >= 85 ? "warn" : ""}`;

  // Banner do App
  document.getElementById("phoneEtaBanner").innerHTML = isFull
    ? `Janela 12h–13h <strong>lotada (Slotting)</strong> · Próxima janela: 13h–14h`
    : `Entrega estimada: <strong>${m.eta} min</strong> · Janela 12h–13h aberta`;

  // Menu do App
  const pList = document.getElementById("phoneMenuList");
  pList.innerHTML = state.dishes
    .map((d) => {
      const blocked = d.qty === 0 && state.stockSync;
      return `
        <div class="dish-card ${blocked ? "sold-out" : ""}">
          <div>
            <strong>${d.name}</strong>
            <div class="dish-price">${d.price}</div>
          </div>
          ${
            blocked
              ? `<span class="badge danger">ESGOTADO</span>`
              : `<button class="btn-primary" onclick="tryOrderDish(${d.id})">Pedir</button>`
          }
        </div>`;
    })
    .join("");
}

function renderIndicators(m) {
  // Gateway
  document.getElementById("gatewayReadout").textContent = `${m.effectiveDemand} / 300 h (${m.payPct}%)`;
  const gBar = document.getElementById("gatewayBar");
  gBar.style.width = `${Math.min(100, m.payPct)}%`;
  gBar.className = `bar-fill ${m.payPct >= 90 ? "danger" : m.payPct >= 70 ? "warn" : ""}`;
  document.getElementById("gatewayNote").textContent =
    m.payPct >= 90
      ? "ALERTA CRÍTICO: Gateway a 95% da capacidade máxima (300/h) — risco imediato de queda nas transações."
      : "Margem operacional segura no gateway de pagamentos.";

  const stressBtn = document.getElementById("stressToggleBtn");
  stressBtn.textContent = state.scenario === "estresse" ? "Voltar ao MVP Ativo" : "Ativar Estresse +50%";

  // Matriz comparativa dos 6 KPIs
  const rows = [
    { name: "Tempo médio de entrega", crisis: "98 min", curr: `${m.eta} min`, good: m.eta <= 38 },
    { name: "Entregas no prazo", crisis: "34%", curr: `${m.onTime}%`, good: m.onTime >= 88 },
    { name: "Fila de embalagem", crisis: "110 pedidos/h", curr: `${m.packQueue} pedidos/h`, good: m.packQueue <= 10 },
    { name: "Produtos vendidos sem estoque", crisis: "260 pedidos", curr: `${m.stockout} pedidos`, good: m.stockout === 0 },
    { name: "Pagamentos não confirmados", crisis: "11,2%", curr: `${m.payFail.toFixed(1).replace(".", ",")}%`, good: m.payFail < 2 },
    { name: "Reclamações (SAC 30/h)", crisis: "145 chamados/h", curr: `${m.sacLoad} chamados/h`, good: m.sacLoad <= 30 }
  ];

  document.getElementById("kpiTableBody").innerHTML = rows
    .map(
      (r) => `
      <tr>
        <td><strong>${r.name}</strong></td>
        <td class="muted">${r.crisis}</td>
        <td><strong>${r.curr}</strong></td>
        <td><span class="badge ${r.good ? "" : "danger"}">${r.good ? "Recuperado" : "Crítico"}</span></td>
      </tr>`
    )
    .join("");
}

// ===== INTERAÇÕES DA COZINHA E APP =====
window.changeDishQty = function (id, delta) {
  const dish = state.dishes.find((d) => d.id === id);
  if (!dish) return;
  dish.qty = Math.max(0, dish.qty + delta);
  addLog(`Estoque atualizado: ${dish.name} agora tem ${dish.qty} un.`);
  renderAll();
};

window.tryOrderDish = function (id) {
  const dish = state.dishes.find((d) => d.id === id);
  const fb = document.getElementById("phoneFeedback");
  fb.classList.remove("hidden", "ok", "danger");

  const cap = state.slotting ? state.slotCap : 190;
  if (state.slotting && state.windowUsed >= cap) {
    fb.classList.add("danger");
    fb.textContent = "Janela 12h–13h lotada pelo Slotting. Pedido redirecionado para 13h–14h.";
    addLog(`Slotting protegeu a operação: pedido de ${dish.name} movido para próxima janela.`);
    return;
  }

  if (dish.qty === 0 && !state.stockSync) {
    state.stockoutEvents += 1;
    fb.classList.add("danger");
    fb.textContent = `FALHA DE INTEGRAÇÃO: "${dish.name}" vendido sem estoque! Estorno e chamado no SAC gerados.`;
    addLog(`ERRO CRÍTICO: venda sem estoque de ${dish.name} (Ação 1 desligada).`);
    renderAll();
    return;
  }

  dish.qty = Math.max(0, dish.qty - 1);
  state.windowUsed += 1;
  fb.classList.add("ok");
  fb.textContent = `Pedido de "${dish.name}" confirmado! Estoque atualizado em tempo real.`;
  addLog(`Pedido confirmado: ${dish.name}. Restam ${dish.qty} un. na cozinha.`);
  renderAll();
};

// ===== CENÁRIOS =====
function applyScenario(scen) {
  state.scenario = scen;
  if (scen === "crise") {
    state.stockSync = false;
    state.slotting = false;
    state.slotCap = 190;
    state.fleetCap = 50;
    addLog("Cenário alterado para CRISE (760 pedidos/4h, 500 refeições, frota 50/h).");
  } else if (scen === "mvp") {
    state.stockSync = true;
    state.slotting = true;
    state.slotCap = 80;
    state.fleetCap = 80;
    state.stockoutEvents = 0;
    addLog("Cenário alterado para MVP ATIVO (3 ações prioritárias ligadas).");
  } else if (scen === "estresse") {
    state.stockSync = true;
    state.slotting = false;
    state.fleetCap = 80;
    addLog("TESTE DE ESTRESSE (+50%): demanda subiu para 285/h. Gateway em 95%!");
  }

  document.getElementById("toggleStockSync").checked = state.stockSync;
  document.getElementById("toggleSlotting").checked = state.slotting;
  document.getElementById("slotCapRange").value = Math.min(120, state.slotCap);
  document.getElementById("fleetCapRange").value = state.fleetCap;

  document.querySelectorAll(".scen-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.scenario === scen);
  });

  renderAll();
}

// ===== EVENTOS DA INTERFACE =====
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

document.querySelectorAll(".scen-btn").forEach((btn) => {
  btn.addEventListener("click", () => applyScenario(btn.dataset.scenario));
});

document.getElementById("presenterSelect").addEventListener("change", (e) => {
  document.getElementById("presenterLabel").textContent = e.target.value;
});

document.querySelectorAll(".font-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".font-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.documentElement.style.setProperty("--font-scale", btn.dataset.font);
  });
});

document.getElementById("themeToggle").addEventListener("click", (e) => {
  document.body.classList.toggle("dark");
  e.target.textContent = document.body.classList.contains("dark") ? "Claro" : "Escuro";
});

document.getElementById("printBtn").addEventListener("click", () => window.print());

document.getElementById("exportCsvBtn").addEventListener("click", () => {
  const m = computeMetrics();
  const csv = [
    "Indicador;Cenario_Crise;Operacao_Atual",
    `Demanda_Hora;190;${m.effectiveDemand}`,
    `Vazao_Hora;50;${m.throughput}`,
    `Tempo_Medio_Entrega_Min;98;${m.eta}`,
    `Entregas_No_Prazo_Pct;34;${m.onTime}`,
    `Vendidos_Sem_Estoque;260;${m.stockout}`,
    `Reclamacoes_SAC_Hora;145;${m.sacLoad}`
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pratocerto_indicadores_mvp.csv";
  a.click();
  URL.revokeObjectURL(url);
  addLog("Arquivo CSV de indicadores exportado com sucesso.");
});

// Controles das 3 Ações
document.getElementById("toggleStockSync").addEventListener("change", (e) => {
  state.stockSync = e.target.checked;
  addLog(`Ação 1 (Sincronização de Estoque): ${state.stockSync ? "ATIVADA" : "DESATIVADA"}.`);
  renderAll();
});

document.getElementById("toggleSlotting").addEventListener("change", (e) => {
  state.slotting = e.target.checked;
  addLog(`Ação 2 (Slotting de Pedidos): ${state.slotting ? "ATIVADO" : "DESATIVADO"}.`);
  renderAll();
});

document.getElementById("slotCapRange").addEventListener("input", (e) => {
  state.slotCap = Number(e.target.value);
  renderAll();
});

document.getElementById("fleetCapRange").addEventListener("input", (e) => {
  state.fleetCap = Number(e.target.value);
  renderAll();
});

document.getElementById("resetMvpBtn").addEventListener("click", () => applyScenario("mvp"));
document.getElementById("clearLogBtn").addEventListener("click", () => {
  document.getElementById("eventLog").innerHTML = "";
});

// Controles da janela e stepper
document.getElementById("fillWindowBtn").addEventListener("click", () => {
  state.windowUsed = state.slotting ? state.slotCap : 190;
  addLog("Janela 12h–13h preenchida para teste de Slotting.");
  renderAll();
});

document.getElementById("resetWindowBtn").addEventListener("click", () => {
  state.windowUsed = 74;
  renderAll();
});

document.getElementById("advanceOrderBtn").addEventListener("click", () => {
  state.orderStep = (state.orderStep + 1) % 5;
  const steps = document.querySelectorAll("#orderStepper .step");
  steps.forEach((el, idx) => el.classList.toggle("active", idx <= state.orderStep));
  document.getElementById("trackerMsg").textContent = trackerMessages[state.orderStep];
});

document.getElementById("stressToggleBtn").addEventListener("click", () => {
  applyScenario(state.scenario === "estresse" ? "mvp" : "estresse");
});

// Cronômetro do Pitch (2 minutos)
let timerSeconds = 120;
let timerInterval = null;

function updateTimerDisplay() {
  const min = String(Math.floor(timerSeconds / 60)).padStart(2, "0");
  const sec = String(timerSeconds % 60).padStart(2, "0");
  document.getElementById("timerDisplay").textContent = `${min}:${sec}`;
}

document.getElementById("timerStartBtn").addEventListener("click", (e) => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    e.target.textContent = "Retomar";
  } else {
    e.target.textContent = "Pausar";
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds -= 1;
        updateTimerDisplay();
      } else {
        clearInterval(timerInterval);
        timerInterval = null;
        e.target.textContent = "Tempo esgotado";
      }
    }, 1000);
  }
});

document.getElementById("timerResetBtn").addEventListener("click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 120;
  updateTimerDisplay();
  document.getElementById("timerStartBtn").textContent = "Iniciar";
});

// Inicialização
addLog("Sistema PratoCerto Ops iniciado no Modo MVP Ativo.");
renderAll();