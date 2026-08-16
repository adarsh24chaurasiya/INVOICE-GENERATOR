let items = [];
let idCounter = 0;
let currency = "$";
let invoices = [];
let editingId = null;

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
      <input type="number" min="0" step="1" value="${item.qty}" data-id="${item.id}" data-field="qty">
      <input type="number" min="0" step="0.01" value="${item.price}" data-id="${item.id}" data-field="price">
      <span class="rowTotal">${formatMoney(item.qty * item.price)}</span>
      <button class="removeBtn" data-id="${item.id}">&times;</button>
    `;
    body.appendChild(row);
  });

  body.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", e => {
      e.target.classList.remove("invalid");
      updateItem(parseInt(e.target.dataset.id), e.target.dataset.field, e.target.value);
      const item = items.find(i => i.id === parseInt(e.target.dataset.id));
      e.target.closest(".item-row").querySelector(".rowTotal").textContent = formatMoney(item.qty * item.price);
    });
  });

  body.querySelectorAll(".removeBtn").forEach(btn => {
    btn.addEventListener("click", e => removeItem(parseInt(e.target.dataset.id)));
  });
}

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

function formatMoney(n) {
  return currency + n.toFixed(2);
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function gatherFormData() {
  return {
    fromName: document.getElementById("fromName").value,
    fromInfo: document.getElementById("fromInfo").value,
    gstin: document.getElementById("gstin").value,
    udyam: document.getElementById("udyam").value,
    toName: document.getElementById("toName").value,
    toInfo: document.getElementById("toInfo").value,
    invoiceNumber: document.getElementById("invoiceNumber").value,
    invoiceDate: document.getElementById("invoiceDate").value,
    dueDate: document.getElementById("dueDate").value,
    currency: document.getElementById("currency").value,
    taxRate: document.getElementById("taxRate").value,
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
  items = [];
  idCounter = 0;
  renderItemsEditor();
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("invoiceDate").value = today;
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
  document.getElementById("taxRate").value = data.taxRate || 0;
  document.getElementById("notes").value = data.notes || "";
  document.getElementById("bankName").value = data.bankName || "";
  document.getElementById("accountNumber").value = data.accountNumber || "";
  document.getElementById("ifscCode").value = data.ifscCode || "";
  items = [];
  idCounter = 0;
  (data.items || []).forEach(i => addItem(i.desc, i.qty, i.price));
}

function invoiceSheetHtml(data, uid) {
  const idLines = [];
  if (data.gstin) idLines.push("GSTIN: " + data.gstin);
  if (data.udyam) idLines.push("Udyam: " + data.udyam);

  const rows = (data.items || []).map(item => `
    <tr>
      <td>${escapeAttr(item.desc) || "—"}</td>
      <td class="num">${item.qty}</td>
      <td class="num">${data.currency}${Number(item.price).toFixed(2)}</td>
      <td class="num">${data.currency}${(item.qty * item.price).toFixed(2)}</td>
    </tr>`).join("");

  const subtotal = (data.items || []).reduce((s, i) => s + i.qty * i.price, 0);
  const taxRate = parseFloat(data.taxRate) || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return `
  <div class="invoice-sheet" id="sheet-${uid}">
    <div class="inv-head">
      <div>
        <div class="inv-title">Invoice</div>
        <div class="inv-number">${escapeAttr(data.invoiceNumber) || "INV-0001"}</div>
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
        <div class="party-ids">${idLines.join("   ·   ")}</div>
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
      <div class="sum-row"><span>Subtotal</span><span>${data.currency}${subtotal.toFixed(2)}</span></div>
      <div class="sum-row"><span>Tax</span><span>${data.currency}${taxAmount.toFixed(2)}</span></div>
      <div class="sum-row total"><span>Total due</span><span>${data.currency}${total.toFixed(2)}</span></div>
    </div>
    <div class="inv-notes">${escapeAttr(data.notes)}</div>
    <div class="inv-bank">
      <span>Payment details</span>
      ${data.bankName ? escapeAttr(data.bankName) + "<br>" : ""}Account No: ${escapeAttr(data.accountNumber)}<br>IFSC: ${escapeAttr(data.ifscCode)}
    </div>
  </div>`;
}

function renderInvoiceList() {
  const list = document.getElementById("invoiceList");
  const empty = document.getElementById("emptyState");
  document.getElementById("invoiceCount").textContent = invoices.length;
  empty.style.display = invoices.length ? "none" : "block";
  list.innerHTML = "";

  invoices.slice().reverse().forEach(inv => {
    const block = document.createElement("div");
    block.className = "invoice-block";
    block.innerHTML = `
      <div class="invoice-actions">
        <button class="btn-outline editInvBtn" data-id="${inv.id}">Back to edit</button>
        <button class="btn-gradient downloadInvBtn" data-id="${inv.id}">Download PDF</button>
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

  list.querySelectorAll(".deleteInvBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      invoices = invoices.filter(i => i.id !== btn.dataset.id);
      saveInvoices();
      renderInvoiceList();
      showToast("Invoice deleted");
    });
  });

  list.querySelectorAll(".downloadInvBtn").forEach(btn => {
    btn.addEventListener("click", () => {
      const inv = invoices.find(i => i.id === btn.dataset.id);
      const element = document.getElementById("sheet-" + btn.dataset.id);
      const opt = {
        margin: 0,
        filename: (inv.invoiceNumber || "invoice") + ".pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" }
      };
      html2pdf().set(opt).from(element).save().then(() => showToast("PDF downloaded"));
    });
  });
}

function saveInvoices() {
  localStorage.setItem("invoicely_list", JSON.stringify(invoices));
}

function loadInvoices() {
  const raw = localStorage.getItem("invoicely_list");
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
    const filled = descInput.value.trim() && parseFloat(priceInput.value) > 0 && parseFloat(qtyInput.value) > 0;
    descInput.classList.toggle("invalid", !descInput.value.trim());
    priceInput.classList.toggle("invalid", !(parseFloat(priceInput.value) > 0));
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
  renderInvoiceList();
  resetForm();
});

document.getElementById("cancelEditBtn").addEventListener("click", () => {
  resetForm();
});

document.getElementById("addItemBtn").addEventListener("click", () => addItem());

document.getElementById("currency").addEventListener("change", e => {
  currency = e.target.value;
  renderItemsEditor();
});

document.querySelectorAll("#formSection input, #formSection textarea").forEach(el => {
  el.addEventListener("input", () => el.classList.remove("invalid"));
});

const backBtn = document.getElementById("backToFormBtn");

backBtn.addEventListener("click", () => {
  document.getElementById("formSection").scrollIntoView({ behavior: "smooth", block: "start" });
});

window.addEventListener("scroll", () => {
  backBtn.classList.toggle("visible", window.scrollY > 400);
});

loadInvoices();
renderInvoiceList();
resetForm();