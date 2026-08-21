(function () {
  if (window.__compactSelectRuntimeInstalled) return;
  window.__compactSelectRuntimeInstalled = true;

  let autoIndex = 0;
  let scheduled = false;
  const cssEscape = value => (window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&"));
  const safeText = value => String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[ch]));
  const tableSelectionProps = {
    category: "categorySelection",
    protocol: "protocolSelection",
    protocolMapper: "protocolMapperSelection",
    pushChannel: "pushChannelSelection",
    pushTemplate: "pushTemplateSelection",
    pushNotice: "pushNoticeSelection",
    shadow: "shadowSelection",
    scene: "sceneSelection"
  };
  const tableSelectionFallback = {};
  const appState = () => {
    try { return typeof state !== "undefined" ? state : null; }
    catch (error) { return null; }
  };
  const appRender = () => {
    try {
      if (typeof render === "function") {
        render();
        upgrade(document);
        upgradeTableSelections(document);
        return true;
      }
    } catch (error) {}
    return false;
  };
  const closeAll = () => {
    document.querySelectorAll(".compact-select.open").forEach(select => select.classList.remove("open"));
  };
  const selectedLabel = select => {
    const option = select.selectedOptions?.[0] || select.options?.[select.selectedIndex || 0];
    return option?.textContent?.trim() || "";
  };
  const isPlaceholder = select => {
    const option = select.selectedOptions?.[0] || select.options?.[select.selectedIndex || 0];
    return !select.value && (!option || option.value === "");
  };
  const buildMenu = select => Array.from(select.options || []).filter(option => option.value !== "").map(option => {
    const active = option.value === select.value ? "active" : "";
    const disabled = option.disabled ? "disabled" : "";
    const label = option.textContent.trim();
    return `<button type="button" data-action="pickCompactSelect" data-compact-select="${safeText(select.id)}" data-value="${safeText(option.value)}" onpointerdown="pickCompactSelect(event, '${safeText(select.id)}', '${safeText(option.value)}')" title="${safeText(label)}" class="${active}" ${disabled}>${safeText(label)}</button>`;
  }).join("");
  const renderShell = select => `<div class="compact-select${select.disabled ? " disabled" : ""}" data-compact-select="${safeText(select.id)}" data-compact-native="1">
    <div class="compact-select-group">
      <button class="compact-select-main" type="button" data-action="toggleCompactSelect" data-compact-select="${safeText(select.id)}" ${select.disabled ? "disabled" : ""}><span class="${isPlaceholder(select) ? "placeholder" : ""}">${safeText(selectedLabel(select))}</span></button>
      <button class="compact-select-arrow" type="button" aria-label="展开" data-action="toggleCompactSelect" data-compact-select="${safeText(select.id)}" ${select.disabled ? "disabled" : ""}>▾</button>
    </div>
    <div class="compact-select-menu">${buildMenu(select)}</div>
  </div>`;
  const syncShell = select => {
    const shell = document.querySelector(`.compact-select[data-compact-select="${cssEscape(select.id)}"]`);
    if (!shell) return;
    shell.classList.toggle("disabled", select.disabled);
    shell.querySelectorAll(".compact-select-main, .compact-select-arrow").forEach(button => {
      button.disabled = select.disabled;
    });
    const text = shell.querySelector(".compact-select-main span");
    if (text) {
      const nextText = selectedLabel(select);
      if (text.textContent !== nextText) text.textContent = nextText;
      text.classList.toggle("placeholder", isPlaceholder(select));
    }
    const menu = shell.querySelector(".compact-select-menu");
    if (menu) {
      const nextMenu = buildMenu(select);
      if (menu.innerHTML !== nextMenu) menu.innerHTML = nextMenu;
    }
  };
  const upgrade = (scope = document) => {
    scope.querySelectorAll?.("select").forEach(select => {
      if (select.closest(".compact-native-ignore")) return;
      if (select.multiple || Number(select.size || 0) > 1) return;
      if (!select.id) {
        autoIndex += 1;
        select.id = `compact-auto-${autoIndex}`;
      }
      select.dataset.compactSource = "1";
      select.classList.add("native-select-source");
      select.setAttribute("aria-hidden", "true");
      select.tabIndex = -1;
      const next = select.nextElementSibling;
      if (next?.classList?.contains("compact-select") && next.dataset.compactSelect === select.id) {
        syncShell(select);
        return;
      }
      select.insertAdjacentHTML("afterend", renderShell(select));
    });
  };
  const tableKindFromRoute = () => {
    const route = String(location.hash || "").replace(/^#/, "").split("?")[0] || "";
    if (route === "/iot/product") return "product";
    if (route === "/iot/device") return "device";
    if (route === "/iot/ota") return "ota";
    if (route === "/iot/group") return "group";
    if (route === "/iot/server/relay") return "serverRelay";
    if (route === "/iot/server/group") return "serverGroup";
    if (route === "/iot/rule/device") return "simpleRuleDevice";
    if (route === "/iot/rule/script") return "simpleRuleScript";
    if (route === "/iot/rule/forward") return "simpleRuleForward";
    if (route === "/iot/rule/alarm") return "alarmRule";
    if (route === "/iot/mqtt/account") return "mqttAccount";
    if (route === "/iot/mqtt/client") return "mqttClient";
    if (route === "/iot/mqtt/authlog") return "mqttAuthLog";
    if (route === "/system/user") return "systemUser";
    if (route === "/authority/role") return "systemRole";
    if (route === "/system/dept") return "systemDept";
    if (route === "/system/menu") return "systemMenu";
    if (route === "/system/dict") return "systemDict";
    if (route === "/system/param") return "systemParam";
    if (route === "/system/tenant") return "systemTenant";
    if (route === "/system/post") return "systemPost";
    if (route === "/system/client") return "systemClient";
    if (route === "/authority/datascope") return "systemDatascope";
    return "";
  };
  const tableKindFromClass = table => {
    const pairs = [
      ["device-table", "device"],
      ["product-server-table", "productServer"],
      ["product-subset-table", "productSubset"],
      ["server-relay-table", "serverRelay"],
      ["server-group-table", "serverGroup"],
      ["scene-rule-table", "scene"],
      ["shadow-table", "shadow"]
    ];
    return pairs.find(([className]) => table.classList.contains(className))?.[1] || "";
  };
  const tableKindFromHeaders = table => {
    const text = [...table.querySelectorAll("thead th")].map(th => th.textContent.replace(/\s+/g, "").trim()).join("|");
    if (text.includes("用户名") && text.includes("签名算法")) return "mqttAccount";
    if (text.includes("客户端id") && text.includes("协议版本")) return "mqttClient";
    if (text.includes("mqtt版本") && text.includes("是否成功")) return "mqttAuthLog";
    if (text.includes("权限名称") && text.includes("权限字段")) return "systemScope";
    if (text.includes("字典编号") && text.includes("字典键值")) return "systemDictItem";
    return "";
  };
  const inferTableKind = table => {
    const existing = table.querySelector('input[type="checkbox"][data-select-kind]')?.dataset.selectKind;
    return existing || table.dataset.selectKind || tableKindFromClass(table) || tableKindFromHeaders(table) || tableKindFromRoute();
  };
  const selectionBucket = kind => {
    if (window.__iotTableSelection?.get && window.__iotTableSelection?.set) {
      return {
        get: () => window.__iotTableSelection.get(kind),
        set: ids => { window.__iotTableSelection.set(kind, ids); }
      };
    }
    const app = appState();
    if (app) {
      const prop = tableSelectionProps[kind] || `${kind}Selection`;
      if (Array.isArray(app[prop])) {
        return {
          get: () => app[prop],
          set: ids => { app[prop] = ids; }
        };
      }
      if (!app.tableSelections || typeof app.tableSelections !== "object") app.tableSelections = {};
      if (!Array.isArray(app.tableSelections[kind])) app.tableSelections[kind] = [];
      return {
        get: () => app.tableSelections[kind],
        set: ids => { app.tableSelections[kind] = ids; }
      };
    }
    if (!Array.isArray(tableSelectionFallback[kind])) tableSelectionFallback[kind] = [];
    return {
      get: () => tableSelectionFallback[kind],
      set: ids => { tableSelectionFallback[kind] = ids; }
    };
  };
  const selectedSet = kind => new Set(selectionBucket(kind).get().map(String));
  const setSelectedSet = (kind, set) => selectionBucket(kind).set([...set]);
  const rowIdentity = (row, index, kind) => {
    const checkbox = row.cells[0]?.querySelector('input[type="checkbox"]');
    if (checkbox?.dataset.id) return checkbox.dataset.id;
    const byAction = row.querySelector("[data-id]")?.dataset.id;
    if (byAction) return byAction;
    const byRoute = row.querySelector("[data-route]")?.dataset.route;
    if (byRoute) return byRoute;
    const text = [...row.cells].slice(1, 5).map(cell => cell.textContent.replace(/\s+/g, " ").trim()).filter(Boolean).join("|");
    return text ? `${kind}:${text.slice(0, 120)}` : `${kind}:row-${index + 1}`;
  };
  const tableBodyRows = table => [...table.querySelectorAll("tbody tr")].filter(row => {
    if (!row.cells.length) return false;
    if (row.querySelector(".empty")) return false;
    return Boolean(row.cells[0]?.querySelector('input[type="checkbox"]'));
  });
  const tableRowCheckboxes = table => tableBodyRows(table).map((row, index) => {
    const input = row.cells[0]?.querySelector('input[type="checkbox"]');
    return { row, input, index };
  }).filter(item => item.input);
  const syncTableSelectionState = table => {
    const kind = inferTableKind(table);
    if (!kind) return;
    const body = tableRowCheckboxes(table).filter(item => item.input.dataset.selectKind === kind);
    const ids = body.map(item => item.input.dataset.id).filter(Boolean).map(String);
    const selected = selectedSet(kind);
    body.forEach(({ input }) => {
      input.checked = selected.has(String(input.dataset.id || ""));
    });
    const header = table.tHead?.rows[0]?.cells[0]?.querySelector('input[type="checkbox"]');
    if (header && header.dataset.selectKind === kind) {
      const checkedCount = ids.filter(id => selected.has(id)).length;
      header.checked = ids.length > 0 && checkedCount === ids.length;
      header.indeterminate = checkedCount > 0 && checkedCount < ids.length;
    }
  };
  const upgradeTableSelections = (scope = document) => {
    const tables = scope.matches?.("table.data-table")
      ? [scope]
      : [...(scope.querySelectorAll?.("table.data-table") || [])];
    tables.forEach((table, tableIndex) => {
      const headCell = table.tHead?.rows[0]?.cells[0];
      const headInput = headCell?.querySelector('input[type="checkbox"]') || null;
      const rowItems = tableRowCheckboxes(table);
      if (!headInput && !rowItems.length) return;
      const allInputs = [headInput, ...rowItems.map(item => item.input)].filter(Boolean);
      if (allInputs.some(input => input.dataset.action && !input.dataset.selectKind)) return;
      const kind = inferTableKind(table) || `table${tableIndex + 1}`;
      table.dataset.selectKind = kind;
      let header = headInput;
      if (!header && headCell && rowItems.length && !headCell.textContent.trim()) {
        headCell.innerHTML = '<input type="checkbox" aria-label="全选">';
        header = headCell.querySelector('input[type="checkbox"]');
      }
      if (header) {
        header.disabled = false;
        header.dataset.selectKind = kind;
        header.dataset.selectAll = "1";
        header.setAttribute("aria-label", "全选");
      }
      rowItems.forEach(({ row, input, index }) => {
        input.disabled = false;
        input.dataset.selectKind = kind;
        input.dataset.id = rowIdentity(row, index, kind);
        if (!input.getAttribute("aria-label")) input.setAttribute("aria-label", `选择第${index + 1}行`);
      });
      syncTableSelectionState(table);
    });
  };
  const updateTableSelection = input => {
    const table = input.closest("table.data-table");
    if (!table) return false;
    const nextChecked = input.checked;
    upgradeTableSelections(table);
    input.checked = nextChecked;
    const kind = input.dataset.selectKind || table.dataset.selectKind || inferTableKind(table);
    if (!kind) return false;
    const selected = selectedSet(kind);
    const ids = tableRowCheckboxes(table).map(item => item.input.dataset.id).filter(Boolean).map(String);
    if (input.dataset.selectAll === "1") {
      ids.forEach(id => nextChecked ? selected.add(id) : selected.delete(id));
    } else {
      const id = String(input.dataset.id || "");
      if (!id) return false;
      if (nextChecked) selected.add(id);
      else selected.delete(id);
    }
    setSelectedSet(kind, selected);
    return true;
  };
  const scheduleUpgrade = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      upgrade(document);
      upgradeTableSelections(document);
    });
  };

  window.upgradeNativeSelects = upgrade;
  window.upgradeTableSelections = upgradeTableSelections;

  document.addEventListener("click", ev => {
    const target = ev.target?.closest ? ev.target : ev.target?.parentElement;
    const toggle = target?.closest?.('[data-action="toggleCompactSelect"]');
    if (toggle?.closest(".compact-select")) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const shell = toggle.closest(".compact-select");
      const source = document.getElementById(shell.dataset.compactSelect || "");
      if (source?.disabled) {
        shell.classList.add("disabled");
        shell.classList.remove("open");
        return;
      }
      const willOpen = !shell.classList.contains("open");
      closeAll();
      shell.classList.toggle("open", willOpen);
      return;
    }

    const option = target?.closest?.('[data-action="pickCompactSelect"]');
    if (option?.closest(".compact-select")) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const shell = option.closest(".compact-select");
      const source = document.getElementById(shell.dataset.compactSelect || "");
      if (source?.disabled) return;
      if (source) {
        source.value = option.dataset.value || "";
        source.dispatchEvent(new Event("change", { bubbles: true }));
        syncShell(source);
      }
      closeAll();
      return;
    }

    if (!target?.closest?.(".compact-select")) closeAll();
  }, true);

  document.addEventListener("change", ev => {
    const input = ev.target?.matches?.('input[type="checkbox"][data-select-kind]')
      ? ev.target
      : null;
    if (!input || !input.closest("table.data-table")) return;
    if (!updateTableSelection(input)) return;
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    if (!appRender()) syncTableSelectionState(input.closest("table.data-table"));
  }, true);

  document.addEventListener("keydown", ev => {
    if (ev.key === "Escape") closeAll();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleUpgrade, { once: true });
  } else {
    scheduleUpgrade();
  }

  new MutationObserver(scheduleUpgrade).observe(document.documentElement, { childList: true, subtree: true });
}());
