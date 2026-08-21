let items = [];
let idCounter = 0;
let currency = "$";
let invoices = [];
let editingId = null;
let currentFilter = "all";
let searchQuery = "";

function initTheme() {
  const savedTheme = localStorage.getItem("invocraft_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const target = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", target);
  localStorage.setItem("invocraft_theme", target);
}

function generateInvoiceNumber() {
  const d = new Date();
  const dateStr = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${rand}`;
}

function addItem(desc = "", qty = 1, price = 0) {
  idCounter++;
  items.push({ id: idCounter, desc, qty, price });
  renderItemsEditor();
}

function removeItem(id) {
  items = items.filter(i => i.id !== id);
  renderItemsEditor();
}

function updateItem(id, field, value) {
  const item = items.find(i => i.id === id);
  if (!item) return;
  item[field] = field === "desc" ? value : parseFloat(value) || 0;
}

function renderItemsEditor() {
  const body = document.getElementById("itemsBody");
  body.innerHTML = "";
  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <input type="text" placeholder="Description" value="${escapeAttr(item.desc)}" data-id="${item.id}" data-field="desc">
      <input type="number" min="1" step="1" value="${item.qty}" data-id="${item.id}" data-field="qty">
      <input type="number" min="0" step="0.01" value="${item.price}" data-id="${item.id}" data-field="price">
      <span class="rowTotal">${formatMoney(item.qty * item.price)}</span>
      <button class="removeBtn" type="button" data-id="${item.id}">&times;</button>
    `;
    body.appendChild(row);
  });

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", e => {
      e.target.classList.remove("invalid");
      updateItem(parseInt(e.target.dataset.id), e.target.dataset.field, e.target.value);
      const item = items.find(i => i.id === parseInt(e.target.dataset.id));
      if (item) {
        e.target.closest(".item-row").querySelector(".rowTotal").textContent = formatMoney(item.qty * item.price);
      }
    });
  });

  body.querySelectorAll(".removeBtn").forEach(btn => {
    btn.addEventListener("click", e => removeItem(parseInt(e.target.dataset.id)));
  });
}

function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatMoney(n) {
  return currency + Number(n || 0).toFixed(2);
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return isNaN(d.getTime()) ? str : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function calculateInvoiceTotal(inv) {
  const subtotal = (inv.items || []).reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0);
  const discountRate = parseFloat(inv.discountRate) || 0;
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = parseFloat(inv.taxRate) || 0;
  const taxAmount = taxableAmount * (taxRate / 100);
  return taxableAmount + taxAmount;
}

function updateAnalytics() {
  const primaryCurrency = invoices.length > 0 ? (invoices[0].currency || "$") : "$";
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalPending = 0;

  invoices.forEach(inv => {
    const total = calculateInvoiceTotal(inv);
    totalInvoiced += total;
    const status = (inv.paymentStatus || "Pending").toLowerCase();
    if (status === "paid") {
      totalPaid += total;
    } else {
      totalPending += total;
    }
  });

  document.getElementById("statTotalInvoiced").textContent = primaryCurrency + totalInvoiced.toFixed(2);
  document.getElementById("statTotalPaid").textContent = primaryCurrency + totalPaid.toFixed(2);
  document.getElementById("statTotalPending").textContent = primaryCurrency + totalPending.toFixed(2);
}

function gatherFormData() {
  return {
    fromName: document.getElementById("fromName").value,
    fromInfo: document.getElementById("fromInfo").value,
    gstin: document.getElementById("gstin").value,
    udyam: document.getElementById("udyam").value,
    toName: document.getElementById("toName").value,
    toInfo: document.getElementById("toInfo").value,
    invoiceNumber: document.getElementById("invoiceNumber").value || generateInvoiceNumber(),
    invoiceDate: document.getElementById("invoiceDate").value,
    dueDate: document.getElementById("dueDate").value,
    currency: document.getElementById("currency").value,
    taxRate: document.getElementById("taxRate").value || 0,
    discountRate: document.getElementById("discountRate").value || 0,
    paymentStatus: document.getElementById("paymentStatus").value || "Pending",
    notes: document.getElementById("notes").value,
    bankName: document.getElementById("bankName").value,
    accountNumber: document.getElementById("accountNumber").value,
    ifscCode: document.getElementById("ifscCode").value,
    items: items.map(i => ({ desc: i.desc, qty: i.qty, price: i.price }))
  };
}

function resetForm() {
  document.querySelectorAll("#formSection input, #formSection textarea").forEach(el => el.value = "");
  document.getElementById("currency").value = "$";
  currency = "$";
  document.getElementById("taxRate").value = 0;
  document.getElementById("discountRate").value = 0;
  document.getElementById("paymentStatus").value = "Pending";
  items = [];
  idCounter = 0;
  renderItemsEditor();
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("invoiceDate").value = today;
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + 14);
  document.getElementById("dueDate").value = dueDateObj.toISOString().split("T")[0];
  document.getElementById("invoiceNumber").value = generateInvoiceNumber();
  addItem("", 1, 0);
  editingId = null;
  document.getElementById("editNotice").classList.add("hidden");
}

function fillForm(data) {
  document.getElementById("fromName").value = data.fromName || "";
  document.getElementById("fromInfo").value = data.fromInfo || "";
  document.getElementById("gstin").value = data.gstin || "";
  document.getElementById("udyam").value = data.udyam || "";
  document.getElementById("toName").value = data.toName || "";
  document.getElementById("toInfo").value = data.toInfo || "";
  document.getElementById("invoiceNumber").value = data.invoiceNumber || "";
  document.getElementById("invoiceDate").value = data.invoiceDate || "";
  document.getElementById("dueDate").value = data.dueDate || "";
  document.getElementById("currency").value = data.currency || "$";
  currency = data.currency || "$";
  document.getElementById("taxRate").value = data.taxRate || 0;
  document.getElementById("discountRate").value = data.discountRate || 0;
  document.getElementById("paymentStatus").value = data.paymentStatus || "Pending";
  document.getElementById("notes").value = data.notes || "";
  document.getElementById("bankName").value = data.bankName || "";
  document.getElementById("accountNumber").value = data.accountNumber || "";
  document.getElementById("ifscCode").value = data.ifscCode || "";
  items = [];
  idCounter = 0;
  (data.items || []).forEach(i => addItem(i.desc, i.qty, i.price));
}

function duplicateInvoice(id) {
  const original = invoices.find(i => i.id === id);
  if (!original) return;
  const clone = JSON.parse(JSON.stringify(original));
  clone.id = "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  clone.invoiceNumber = generateInvoiceNumber();
  clone.invoiceDate = new Date().toISOString().split("T")[0];
  clone.paymentStatus = "Pending";
  invoices.push(clone);
  saveInvoices();
  updateAnalytics();
  renderInvoiceList();
  showToast("Invoice duplicated");
}

function invoiceSheetHtml(data, uid) {
  const idLines = [];
  if (data.gstin) idLines.push("GSTIN: " + escapeAttr(data.gstin));
  if (data.udyam) idLines.push("Udyam: " + escapeAttr(data.udyam));

  const curr = data.currency || "$";
  const rows = (data.items || []).map(item => `
    <tr>
      <td>${escapeAttr(item.desc) || "—"}</td>
      <td class="num">${item.qty}</td>
      <td class="num">${curr}${Number(item.price).toFixed(2)}</td>
      <td class="num">${curr}${(item.qty * item.price).toFixed(2)}</td>
    </tr>`).join("");

  const subtotal = (data.items || []).reduce((s, i) => s + (i.qty * i.price), 0);
  const discountRate = parseFloat(data.discountRate) || 0;
  const discountAmount = subtotal * (discountRate / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxRate = parseFloat(data.taxRate) || 0;
  const taxAmount = taxableAmount * (taxRate / 100);
  const total = taxableAmount + taxAmount;
  const statusClass = (data.paymentStatus || "pending").toLowerCase();

  return `
  <div class="invoice-sheet" id="sheet-${uid}">
    <div class="inv-head">
      <div class="inv-title-group">
        <div class="inv-title">Invoice</div>
        <div class="inv-number">${escapeAttr(data.invoiceNumber) || "INV-0001"}</div>
        <span class="status-badge status-${statusClass}">${escapeAttr(data.paymentStatus || "Pending")}</span>
      </div>
      <div class="inv-dates">
        <div><span>Issued</span><b>${formatDate(data.invoiceDate)}</b></div>
        <div><span>Due</span><b>${formatDate(data.dueDate)}</b></div>
      </div>
    </div>
    <div class="inv-parties">
      <div>
        <div class="party-label">From</div>
        <div class="party-name">${escapeAttr(data.fromName) || "Your Business"}</div>
        <div class="party-info">${escapeAttr(data.fromInfo)}</div>
        <div class="party-ids">${idLines.join(" &nbsp;·&nbsp; ")}</div>
      </div>
      <div>
        <div class="party-label">Billed to</div>
        <div class="party-name">${escapeAttr(data.toName) || "Client Name"}</div>
        <div class="party-info">${escapeAttr(data.toInfo)}</div>
      </div>
    </div>
    <table class="inv-table">
      <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="inv-summary">
      <div class="sum-row"><span>Subtotal</span><span>${curr}${subtotal.toFixed(2)}</span></div>
      ${discountRate > 0 ? `<div class="sum-row"><span>Discount (${discountRate}%)</span><span>-${curr}${discountAmount.toFixed(2)}</span></div>` : ""}
      <div class="sum-row"><span>Tax (${taxRate}%)</span><span>+${curr}${taxAmount.toFixed(2)}</span></div>
      <div class="sum-row total"><span>Total due</span><span>${curr}${total.toFixed(2)}</span></div>
    </div>
    ${data.notes ? `<div class="inv-notes">${escapeAttr(data.notes)}</div>` : ""}
    <div class="inv-bank">
      <span>Payment details</span>
      ${data.bankName ? escapeAttr(data.bankName) + "<br>" : ""}Account No: ${escapeAttr(data.accountNumber)}<br>IFSC / SWIFT: ${escapeAttr(data.ifscCode)}
    </div>
  </div>`;
}

function renderInvoiceList() {
  const list = document.getElementById("invoiceList");
  const empty = document.getElementById("emptyState");
  const emptyText = document.getElementById("emptyStateText");
  document.getElementById("invoiceCount").textContent = invoices.length;

  let filtered = invoices.slice().reverse();

  if (currentFilter !== "all") {
    filtered = filtered.filter(inv => (inv.paymentStatus || "Pending").toLowerCase() === currentFilter.toLowerCase());
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(inv => {
      const invNum = (inv.invoiceNumber || "").toLowerCase();
      const from = (inv.fromName || "").toLowerCase();
      const to = (inv.toName || "").toLowerCase();
      return invNum.includes(q) || from.includes(q) || to.includes(q);
    });
  }

  if (invoices.length === 0) {
    empty.style.display = "block";
    emptyText.textContent = "No invoices generated yet";
  } else if (filtered.length === 0) {
    empty.style.display = "block";
    emptyText.textContent = "No invoices match your search or filter";
  } else {
    empty.style.display = "none";
  }

  list.innerHTML = "";

  filtered.forEach(inv => {
    const block = document.createElement("div");
    block.className = "invoice-block";
    block.innerHTML = `
      <div class="invoice-actions">
        <button class="btn-outline editInvBtn" data-id="${inv.id}">Edit</button>
        <button class="btn-outline duplicateInvBtn" data-id="${inv.id}">Duplicate</button>
        <button class="btn-gradient downloadInvBtn" data-id="${inv.id}">Download PDF</button>
        <button class="btn-outline printInvBtn" data-id="${inv.id}">Print</button>
        <button class="btn-danger deleteInvBtn" data-id="${inv.id}">Delete</button>
      </div>
      ${invoiceSheetHtml(inv, inv.id)}
    `;
    list.appendChild(block);
  });

  list.querySelectorAll(".editInvBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const inv = invoices.find(i => i.id === btn.dataset.id);
      if (!inv) return;
      editingId = inv.id;
      fillForm(inv);
      document.getElementById("editNoticeNumber").textContent = inv.invoiceNumber || "INV-0001";
      document.getElementById("editNotice").classList.remove("hidden");
      document.getElementById("formSection").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  list.querySelectorAll(".duplicateInvBtn").forEach(btn => {
    btn.addEventListener("click", () => duplicateInvoice(btn.dataset.id));
  });

  list.querySelectorAll(".deleteInvBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      invoices = invoices.filter(i => i.id !== btn.dataset.id);
      saveInvoices();
      updateAnalytics();
      renderInvoiceList();
      showToast("Invoice deleted");
    });
  });

  list.querySelectorAll(".downloadInvBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const inv = invoices.find(i => i.id === btn.dataset.id);
      const element = document.getElementById("sheet-" + btn.dataset.id);
      const opt = {
        margin: [10, 10, 10, 10],
        filename: (inv.invoiceNumber || "invoice") + ".pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };
      html2pdf().set(opt).from(element).save().then(() => showToast("PDF downloaded"));
    });
  });

  list.querySelectorAll(".printInvBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sheet = document.getElementById("sheet-" + btn.dataset.id);
      if (!sheet) return;
      const printWindow = window.open("", "_blank");
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print Invoice</title>
          <link rel="stylesheet" href="style.css">
          <style>
            body { background: #fff !important; color: #000 !important; padding: 20px; }
            .invoice-sheet { box-shadow: none !important; border: 1px solid #ddd !important; }
          </style>
        </head>
        <body>
          ${sheet.outerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    });
  });
}

function exportToCSV() {
  if (!invoices.length) {
    showToast("No invoices to export");
    return;
  }
  const headers = ["Invoice Number", "Issue Date", "Due Date", "From", "Client", "Status", "Currency", "Subtotal", "Tax Rate (%)", "Discount (%)", "Total Due"];
  const rows = invoices.map(inv => {
    const subtotal = (inv.items || []).reduce((s, i) => s + (i.qty * i.price), 0);
    const discountRate = parseFloat(inv.discountRate) || 0;
    const discountAmount = subtotal * (discountRate / 100);
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxRate = parseFloat(inv.taxRate) || 0;
    const taxAmount = taxableAmount * (taxRate / 100);
    const total = taxableAmount + taxAmount;

    return [
      `"${(inv.invoiceNumber || '').replace(/"/g, '""')}"`,
      `"${(inv.invoiceDate || '').replace(/"/g, '""')}"`,
      `"${(inv.dueDate || '').replace(/"/g, '""')}"`,
      `"${(inv.fromName || '').replace(/"/g, '""')}"`,
      `"${(inv.toName || '').replace(/"/g, '""')}"`,
      `"${(inv.paymentStatus || 'Pending').replace(/"/g, '""')}"`,
      `"${(inv.currency || '$').replace(/"/g, '""')}"`,
      subtotal.toFixed(2),
      taxRate.toFixed(2),
      discountRate.toFixed(2),
      total.toFixed(2)
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `invoices_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV exported");
}

function saveInvoices() {
  localStorage.setItem("invocraft_invoices", JSON.stringify(invoices));
}

function loadInvoices() {
  const raw = localStorage.getItem("invocraft_invoices") || localStorage.getItem("invoicely_list");
  invoices = raw ? JSON.parse(raw) : [];
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2200);
}

function requiredFieldIds() {
  return ["fromName", "fromInfo", "toName", "toInfo", "invoiceNumber", "invoiceDate", "dueDate", "accountNumber", "ifscCode"];
}

function validateForm() {
  let valid = true;
  requiredFieldIds().forEach(id => {
    const el = document.getElementById(id);
    if (!el.value.trim()) {
      el.classList.add("invalid");
      valid = false;
    } else {
      el.classList.remove("invalid");
    }
  });

  const itemRows = document.querySelectorAll("#itemsBody .item-row");
  let hasValidItem = false;
  itemRows.forEach(row => {
    const descInput = row.querySelector('[data-field="desc"]');
    const priceInput = row.querySelector('[data-field="price"]');
    const qtyInput = row.querySelector('[data-field="qty"]');
    const filled = descInput.value.trim() && parseFloat(priceInput.value) >= 0 && parseFloat(qtyInput.value) > 0;
    descInput.classList.toggle("invalid", !descInput.value.trim());
    priceInput.classList.toggle("invalid", !(parseFloat(priceInput.value) >= 0));
    qtyInput.classList.toggle("invalid", !(parseFloat(qtyInput.value) > 0));
    if (filled) hasValidItem = true;
  });

  if (!hasValidItem) valid = false;
  return valid;
}

document.getElementById("generateBtn").addEventListener("click", () => {
  if (!validateForm()) {
    showToast("Please fill all required fields");
    return;
  }
  const data = gatherFormData();
  if (editingId) {
    data.id = editingId;
    invoices = invoices.map(i => i.id === editingId ? data : i);
    showToast("Invoice updated");
  } else {
    data.id = "inv_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    invoices.push(data);
    showToast("Invoice generated");
  }
  saveInvoices();
  updateAnalytics();
  renderInvoiceList();
  resetForm();
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  resetForm();
});

document.getElementById("addItemBtn").addEventListener("click", () => addItem());

document.getElementById("autoInvNumberBtn").addEventListener("click", () => {
  document.getElementById("invoiceNumber").value = generateInvoiceNumber();
});

document.getElementById("currency").addEventListener("change", e => {
  currency = e.target.value;
  renderItemsEditor();
});

document.getElementById("themeToggleBtn").addEventListener("click", toggleTheme);

document.getElementById("exportCsvBtn").addEventListener("click", exportToCSV);

document.getElementById("invoiceSearchInput").addEventListener("input", e => {
  searchQuery = e.target.value;
  renderInvoiceList();
});

document.querySelectorAll(".filter-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.dataset.filter;
    renderInvoiceList();
  });
});

document.querySelectorAll("#formSection input, #formSection textarea, #formSection select").forEach(el => {
  el.addEventListener("input", () => el.classList.remove("invalid"));
});

const backBtn = document.getElementById("backToFormBtn");

backBtn.addEventListener("click", () => {
  document.getElementById("formSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("scroll", () => {
  backBtn.classList.toggle("visible", window.scrollY > 400);
});

initTheme();
loadInvoices();
updateAnalytics();
renderInvoiceList();
resetForm();