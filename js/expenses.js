// The 12 Chronicles — Group Expense Tracker & Smart Debt Settlement Engine

(function () {
  "use strict";

  let expenses = [];
  let categories = ["Food", "Travel", "Hotel", "Sightseeing", "Shopping", "Other"];
  let unsubscribeExpenses = null;

  const els = {
    total: document.getElementById("total-trip-expenses"),
    perPerson: document.getElementById("per-person-avg"),
    perPersonNote: document.getElementById("per-person-note"),
    userBalance: document.getElementById("user-balance"),
    userBalanceNote: document.getElementById("user-balance-note"),
    list: document.getElementById("expense-list"),
    memberBalances: document.getElementById("member-balances-grid"),
    memberBalanceCount: document.getElementById("member-balance-count"),
    debts: document.getElementById("debts-summary-list"),
    storageLabel: document.getElementById("expense-storage-label"),
    roleNotice: document.getElementById("expense-role-notice"),
    addButton: document.getElementById("open-add-expense-btn"),
    categoriesButton: document.getElementById("manage-categories-btn"),
    modal: document.getElementById("expense-modal"),
    modalTitle: document.getElementById("expense-modal-title"),
    form: document.getElementById("expense-form"),
    expenseId: document.getElementById("expense-id"),
    title: document.getElementById("exp-title"),
    amount: document.getElementById("exp-amount"),
    category: document.getElementById("exp-category"),
    date: document.getElementById("exp-date"),
    paymentStatus: document.getElementById("exp-payment-status"),
    payer: document.getElementById("exp-payer-select"),
    splitContainer: document.getElementById("split-members-checkboxes"),
    description: document.getElementById("exp-description"),
    saveButton: document.getElementById("save-expense-btn"),
    cancelButton: document.getElementById("cancel-expense-btn"),
    categoriesModal: document.getElementById("categories-modal"),
    categoriesInput: document.getElementById("categories-input"),
    saveCategoriesButton: document.getElementById("save-categories-btn")
  };

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  function formatMoney(value) {
    const amount = Number(value || 0);
    return "₹" + Math.round(amount).toLocaleString("en-IN");
  }

  function todayIso() {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
  }

  function getMembers() {
    return window.authService ? window.authService.getAllMembers() : [];
  }

  function isManager() {
    return !!(window.authService && window.authService.canManageExpenses());
  }

  function categoryIcon(category) {
    const icons = {
      Travel: "🚂",
      Hotel: "🏨",
      Food: "🍲",
      Sightseeing: "🎟️",
      Shopping: "🛍️",
      Other: "🧾"
    };
    return icons[category] || "💰";
  }

  function statusPill(status) {
    const value = status || "pending";
    const classes = value === "paid"
      ? "bg-green-100 text-green-800 border-green-200"
      : value === "settled"
        ? "bg-[#354B3A]/10 text-[#354B3A] border-[#354B3A]/25"
        : "bg-[#C76B4A]/10 text-[#8f3f26] border-[#C76B4A]/25";
    const label = value.charAt(0).toUpperCase() + value.slice(1);
    return '<span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ' + classes + '">' + label + "</span>";
  }

  function resolveMember(id, name) {
    if (window.authService) {
      const byId = id ? window.authService.getMemberById(id) : null;
      if (byId) return byId;
      if (name) return window.authService.getMemberByName(name);
    }
    return null;
  }

  function renderRoleNotice() {
    if (!els.roleNotice) return;
    const user = window.authService ? window.authService.getCurrentUser() : null;
    if (!user) {
      els.roleNotice.classList.add("hidden");
      return;
    }

    let html = "";
    if (window.authService.isPendingTreasurer()) {
      html = '<div class="p-4 rounded-xl bg-[#C76B4A]/10 border border-[#C76B4A]/30 text-xs text-[#8f3f26] leading-relaxed">' +
        "<strong>Treasurer request pending.</strong> An Admin must approve you before you can change the ledger. You can still view every expense and balance." +
        "</div>";
    } else if (window.authService.isAdmin()) {
      html = '<div class="p-4 rounded-xl bg-[#354B3A]/10 border border-[#354B3A]/30 text-xs text-[#354B3A] leading-relaxed">' +
        "<strong>Admin access.</strong> You can add, edit, delete and settle expenses, and manage categories." +
        "</div>";
    } else if (window.authService.isTreasurer()) {
      html = '<div class="p-4 rounded-xl bg-[#354B3A]/10 border border-[#354B3A]/30 text-xs text-[#354B3A] leading-relaxed">' +
        "<strong>Treasurer access.</strong> You can add, edit, delete and settle expenses, and manage categories." +
        "</div>";
    } else {
      html = '<div class="p-4 rounded-xl bg-[#F7F4EC] border border-[#A4A88A]/40 text-xs text-[#282824]/75 leading-relaxed">' +
        "<strong>Member access.</strong> The shared ledger is read-only for members. Ask an approved Treasurer or Admin to update expenses." +
        "</div>";
    }

    els.roleNotice.innerHTML = html;
    els.roleNotice.classList.remove("hidden");
  }

  function updatePermissions() {
    const manager = isManager();
    if (els.addButton) els.addButton.classList.toggle("hidden", !manager);
    if (els.categoriesButton) els.categoriesButton.classList.toggle("hidden", !manager);
    if (els.storageLabel) {
      const mode = window.authService ? window.authService.mode : "supabase";
      els.storageLabel.textContent = mode === "supabase"
        ? "Synced live with Supabase"
        : "Local preview ledger";
    }
  }

  function fillCategoryOptions(selected) {
    if (!els.category) return;
    const values = categories.slice();
    if (selected && values.indexOf(selected) === -1) values.push(selected);
    els.category.innerHTML = values.map(function (category) {
      return '<option value="' + escapeHtml(category) + '"' +
        (category === selected ? " selected" : "") + ">" + escapeHtml(category) + "</option>";
    }).join("");
  }

  function fillMemberOptions(selectedPayer, selectedSplit) {
    const members = getMembers();
    if (els.payer) {
      els.payer.innerHTML = members.map(function (member) {
        return '<option value="' + escapeHtml(member.uid) + '"' +
          (member.uid === selectedPayer ? " selected" : "") + ">" +
          escapeHtml(member.fullName) + (member.nickname ? " (" + escapeHtml(member.nickname) + ")" : "") +
          "</option>";
      }).join("");
    }

    if (els.splitContainer) {
      const split = Array.isArray(selectedSplit) ? selectedSplit : null;
      els.splitContainer.innerHTML = members.map(function (member) {
        const checked = split ? split.indexOf(member.uid) !== -1 : true;
        return '<label class="flex items-center gap-2 text-xs text-[#282824] cursor-pointer">' +
          '<input type="checkbox" name="split-member" value="' + escapeHtml(member.uid) + '"' +
          (checked ? " checked" : "") + ' class="journal-checkbox" />' +
          "<span>" + escapeHtml(member.fullName.split(" ")[0]) + "</span></label>";
      }).join("");
    }
  }

  function renderSummary() {
    const members = getMembers();
    const total = expenses.reduce(function (sum, item) { return sum + Number(item.amount || 0); }, 0);
    const memberCount = members.length || 1;
    const average = Math.round(total / memberCount);

    if (els.total) els.total.textContent = formatMoney(total);
    if (els.perPerson) els.perPerson.textContent = formatMoney(average);
    if (els.perPersonNote) {
      els.perPersonNote.textContent = "Fair share across " + memberCount + " registered member" + (memberCount === 1 ? "" : "s");
    }

    const user = window.authService ? window.authService.getCurrentUser() : null;
    if (els.userBalance) {
      if (!user) {
        els.userBalance.innerHTML = '<span class="text-[#282824]">₹0</span>';
      } else {
        let paidByMe = 0;
        let myShare = 0;
        const memberIds = members.map(function (member) { return member.uid; });

        expenses.forEach(function (expense) {
          const amount = Number(expense.amount || 0);
          const payer = resolveMember(expense.paidById, expense.paidByName);
          const participants = (expense.splitBetween && expense.splitBetween.length)
            ? expense.splitBetween.filter(function (id) { return memberIds.indexOf(id) !== -1; })
            : memberIds;

          if (payer && payer.uid === user.uid) paidByMe += amount;
          if (participants.indexOf(user.uid) !== -1) {
            myShare += amount / (participants.length || 1);
          }
        });

        const net = Math.round(paidByMe - myShare);
        if (net > 0) {
          els.userBalance.innerHTML = '<span class="text-green-700 font-bold">+' + formatMoney(net) + '</span> ' +
            '<span class="text-xs text-green-600 block">(You are owed)</span>';
        } else if (net < 0) {
          els.userBalance.innerHTML = '<span class="text-red-700 font-bold">-' + formatMoney(Math.abs(net)) + '</span> ' +
            '<span class="text-xs text-red-600 block">(You owe the squad)</span>';
        } else {
          els.userBalance.innerHTML = '<span class="text-[#282824] font-bold">₹0</span> ' +
            '<span class="text-xs text-[#A4A88A] block">(Settled up)</span>';
        }
      }
    }
    if (els.userBalanceNote) {
      els.userBalanceNote.textContent = user ? "Based on your member account" : "Log in to see your balance";
    }
  }

  function renderExpenseList() {
    if (!els.list) return;
    const manager = isManager();

    if (!expenses.length) {
      els.list.innerHTML = '<div class="text-center py-12 bg-white rounded-xl border border-[#A4A88A]/30 p-6">' +
        '<p class="font-serif text-base font-bold text-[#282824]">No expenses logged yet</p>' +
        '<p class="text-xs text-[#282824]/60 mt-1">' +
        (manager
          ? "Add tickets, hotel advances or dinner bills using the button above."
          : "Your Treasurer will add shared expenses here.") +
        "</p></div>";
      return;
    }

    els.list.innerHTML = expenses.map(function (expense) {
      const payer = resolveMember(expense.paidById, expense.paidByName);
      const payerName = payer ? payer.fullName : (expense.paidByName || "Squad");
      const splitLength = (expense.splitBetween && expense.splitBetween.length)
        ? expense.splitBetween.length
        : getMembers().length || 1;
      const perPerson = Number(expense.amount || 0) / (splitLength || 1);
      const description = expense.description
        ? '<p class="text-[11px] text-[#282824]/60 mt-0.5 line-clamp-2">' + escapeHtml(expense.description) + "</p>"
        : "";
      const audit = expense.updatedByName
        ? "Last updated by " + escapeHtml(expense.updatedByName)
        : expense.createdByName
          ? "Added by " + escapeHtml(expense.createdByName)
          : "";

      return `
        <div class="journal-card p-4 bg-white border border-[#A4A88A]/30">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3.5 flex-1 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-[#F7F4EC] border border-[#A4A88A]/30 flex items-center justify-center text-lg flex-shrink-0">
                ${categoryIcon(expense.category)}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-1.5 mb-0.5">
                  <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#354B3A]/10 text-[#354B3A]">${escapeHtml(expense.category)}</span>
                  <span class="text-[11px] text-[#A4A88A]">${escapeHtml(expense.date || "")}</span>
                  ${statusPill(expense.paymentStatus)}
                </div>
                <h4 class="font-serif font-bold text-sm text-[#282824]">${escapeHtml(expense.title)}</h4>
                ${description}
                <p class="text-xs text-[#282824]/70 mt-1">
                  Paid by <strong class="text-[#282824]">${escapeHtml(payerName)}</strong> • Split equally amongst ${splitLength} friend${splitLength === 1 ? "" : "s"}
                </p>
                ${audit ? '<p class="text-[10px] text-[#A4A88A] mt-1">' + audit + "</p>" : ""}
              </div>
            </div>

            <div class="text-right flex-shrink-0">
              <span class="font-serif font-bold text-base text-[#282824] block">${formatMoney(expense.amount)}</span>
              <span class="text-[10px] text-[#A4A88A] block">${formatMoney(perPerson)} / person</span>
            </div>
          </div>

          ${manager ? `
            <div class="mt-3 pt-3 border-t border-[#A4A88A]/20 flex flex-wrap items-center justify-between gap-2">
              <select data-status="${escapeHtml(expense.id)}"
                      class="px-2.5 py-1.5 rounded-lg border border-[#A4A88A]/40 text-[11px] font-semibold text-[#282824] bg-white focus:outline-none focus:border-[#354B3A]">
                <option value="pending"${expense.paymentStatus === "pending" ? " selected" : ""}>Pending</option>
                <option value="paid"${expense.paymentStatus === "paid" ? " selected" : ""}>Paid</option>
                <option value="settled"${expense.paymentStatus === "settled" ? " selected" : ""}>Settled</option>
              </select>
              <div class="flex items-center gap-1">
                <button data-edit-exp="${escapeHtml(expense.id)}" class="px-2.5 py-1.5 rounded-lg border border-[#A4A88A]/40 text-[11px] font-semibold text-[#354B3A] hover:bg-[#F7F4EC]">Edit</button>
                <button data-delete-exp="${escapeHtml(expense.id)}" class="px-2.5 py-1.5 rounded-lg border border-[#C76B4A]/40 text-[11px] font-semibold text-[#C76B4A] hover:bg-[#C76B4A]/10">Delete</button>
              </div>
            </div>
          ` : ""}
        </div>
      `;
    }).join("");

    if (!manager) return;

    els.list.querySelectorAll("[data-edit-exp]").forEach(function (button) {
      button.addEventListener("click", function () {
        const expense = expenses.find(function (item) { return item.id === button.getAttribute("data-edit-exp"); });
        if (expense) openEditModal(expense);
      });
    });

    els.list.querySelectorAll("[data-delete-exp]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const id = button.getAttribute("data-delete-exp");
        if (!window.confirm("Delete this expense entry from the shared ledger?")) return;
        button.disabled = true;
        try {
          await window.chroniclesData.deleteExpense(id);
          window.showToast("Expense removed from the ledger.", "info");
        } catch (error) {
          window.showToast(error.message, "error");
          button.disabled = false;
        }
      });
    });

    els.list.querySelectorAll("[data-status]").forEach(function (select) {
      select.addEventListener("change", async function () {
        const id = select.getAttribute("data-status");
        select.disabled = true;
        try {
          await window.chroniclesData.updateExpensePaymentStatus(id, select.value);
          window.showToast("Payment status updated.", "success");
        } catch (error) {
          window.showToast(error.message, "error");
          select.disabled = false;
        }
      });
    });
  }

  function calculateBalancesAndDebts() {
    const members = getMembers();
    const memberIds = members.map(function (member) { return member.uid; });
    const netBalances = {};
    memberIds.forEach(function (id) { netBalances[id] = 0; });

    expenses.forEach(function (expense) {
      const amount = Number(expense.amount || 0);
      const payer = resolveMember(expense.paidById, expense.paidByName);
      const participants = (expense.splitBetween && expense.splitBetween.length)
        ? expense.splitBetween.filter(function (id) { return memberIds.indexOf(id) !== -1; })
        : memberIds.slice();
      if (!participants.length) return;

      if (payer && netBalances[payer.uid] !== undefined) {
        netBalances[payer.uid] += amount;
      }
      const share = amount / participants.length;
      participants.forEach(function (id) {
        netBalances[id] -= share;
      });
    });

    if (els.memberBalances) {
      els.memberBalances.innerHTML = members.map(function (member) {
        const net = Math.round(netBalances[member.uid] || 0);
        const color = net > 0 ? "text-green-700" : net < 0 ? "text-red-700" : "text-gray-500";
        const label = net > 0 ? "Gets back" : net < 0 ? "Owes squad" : "Settled";
        return `
          <div class="journal-card p-4 flex items-center justify-between gap-3 bg-white border border-[#A4A88A]/30">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${escapeHtml(member.avatar)}" alt="" class="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              <div class="truncate">
                <p class="text-xs font-bold text-[#282824] truncate">${escapeHtml(member.fullName)}</p>
                <p class="text-[10px] text-[#A4A88A] truncate">${escapeHtml(member.nickname || member.effectiveRole)}</p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <span class="text-xs font-bold ${color}">
                ${net > 0 ? "+" + formatMoney(net) : net < 0 ? "-" + formatMoney(Math.abs(net)) : "₹0"}
              </span>
              <span class="text-[9px] uppercase tracking-wider text-[#A4A88A] block">${label}</span>
            </div>
          </div>
        `;
      }).join("");
    }

    if (els.memberBalanceCount) {
      els.memberBalanceCount.textContent = members.length + " member" + (members.length === 1 ? "" : "s");
    }

    const creditors = [];
    const debtors = [];
    memberIds.forEach(function (id) {
      const balance = Math.round(netBalances[id]);
      if (balance > 1) creditors.push({ id: id, amount: balance });
      else if (balance < -1) debtors.push({ id: id, amount: -balance });
    });

    creditors.sort(function (a, b) { return b.amount - a.amount; });
    debtors.sort(function (a, b) { return b.amount - a.amount; });

    const transactions = [];
    let creditorIndex = 0;
    let debtorIndex = 0;

    while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
      const creditor = creditors[creditorIndex];
      const debtor = debtors[debtorIndex];
      const settleAmount = Math.min(creditor.amount, debtor.amount);
      if (settleAmount > 1) {
        transactions.push({ from: debtor.id, to: creditor.id, amount: settleAmount });
      }
      creditor.amount -= settleAmount;
      debtor.amount -= settleAmount;
      if (creditor.amount <= 1) creditorIndex += 1;
      if (debtor.amount <= 1) debtorIndex += 1;
    }

    if (!els.debts) return;
    if (!transactions.length) {
      els.debts.innerHTML = '<div class="p-4 bg-green-50 border border-green-200 rounded-xl text-center text-xs text-green-800">' +
        "All squad expenses are completely balanced. No pending settlements.</div>";
      return;
    }

    els.debts.innerHTML = transactions.map(function (transaction) {
      const fromMember = resolveMember(transaction.from);
      const toMember = resolveMember(transaction.to);
      return `
        <div class="flex items-center justify-between gap-3 p-3.5 bg-[#F7F4EC] rounded-xl border border-[#A4A88A]/30 text-xs">
          <div class="flex items-center gap-2 min-w-0">
            <img src="${fromMember ? escapeHtml(fromMember.avatar) : ""}" alt="" class="w-6 h-6 rounded-full object-cover flex-shrink-0" />
            <span class="font-bold text-[#282824] truncate">${fromMember ? escapeHtml(fromMember.fullName.split(" ")[0]) : "Member"}</span>
            <span class="text-[#A4A88A] flex-shrink-0">owes</span>
            <img src="${toMember ? escapeHtml(toMember.avatar) : ""}" alt="" class="w-6 h-6 rounded-full object-cover flex-shrink-0" />
            <span class="font-bold text-[#354B3A] truncate">${toMember ? escapeHtml(toMember.fullName.split(" ")[0]) : "Member"}</span>
          </div>
          <span class="font-serif font-bold text-sm text-[#C76B4A] flex-shrink-0">${formatMoney(transaction.amount)}</span>
        </div>
      `;
    }).join("");
  }

  function renderAll() {
    updatePermissions();
    renderRoleNotice();
    renderSummary();
    renderExpenseList();
    calculateBalancesAndDebts();
  }

  function openAddModal() {
    if (!isManager()) {
      window.showToast("Only an approved Treasurer or Admin can add expenses.", "error");
      return;
    }
    if (!getMembers().length) {
      window.showToast("No registered members found yet. Invite the squad first.", "error");
      return;
    }

    if (els.expenseId) els.expenseId.value = "";
    if (els.modalTitle) els.modalTitle.textContent = "Log New Group Expense";
    if (els.saveButton) els.saveButton.textContent = "Save Expense";
    if (els.form) els.form.reset();

    const user = window.authService.getCurrentUser();
    const members = getMembers();
    const defaultPayer = user && members.some(function (member) { return member.uid === user.uid; })
      ? user.uid
      : members[0].uid;

    fillCategoryOptions(categories[0]);
    fillMemberOptions(defaultPayer, null);

    if (els.date) els.date.value = todayIso();
    if (els.paymentStatus) els.paymentStatus.value = "pending";

    if (els.modal) els.modal.classList.remove("hidden");
  }

  function openEditModal(expense) {
    if (!isManager()) {
      window.showToast("Only an approved Treasurer or Admin can edit expenses.", "error");
      return;
    }
    if (els.expenseId) els.expenseId.value = expense.id;
    if (els.modalTitle) els.modalTitle.textContent = "Edit Group Expense";
    if (els.saveButton) els.saveButton.textContent = "Update Expense";

    if (els.title) els.title.value = expense.title || "";
    if (els.amount) els.amount.value = expense.amount || "";
    if (els.date) els.date.value = expense.date || todayIso();
    if (els.paymentStatus) els.paymentStatus.value = expense.paymentStatus || "pending";
    if (els.description) els.description.value = expense.description || "";

    fillCategoryOptions(expense.category || categories[0]);
    fillMemberOptions(expense.paidById, expense.splitBetween || []);

    if (els.modal) els.modal.classList.remove("hidden");
  }

  function closeModal() {
    if (els.modal) els.modal.classList.add("hidden");
    if (els.form) els.form.reset();
    if (els.expenseId) els.expenseId.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isManager()) {
      window.showToast("Only an approved Treasurer or Admin can save expenses.", "error");
      return;
    }

    const id = els.expenseId ? els.expenseId.value : "";
    const title = els.title ? els.title.value.trim() : "";
    const amount = els.amount ? parseFloat(els.amount.value) : NaN;
    const category = els.category ? els.category.value : "Other";
    const date = els.date ? els.date.value : todayIso();
    const paymentStatus = els.paymentStatus ? els.paymentStatus.value : "pending";
    const paidById = els.payer ? els.payer.value : "";
    const description = els.description ? els.description.value.trim() : "";
    const payer = window.authService.getMemberById(paidById);

    const checked = els.splitContainer
      ? Array.from(els.splitContainer.querySelectorAll('input[type="checkbox"]:checked'))
      : [];
    const splitBetween = checked.map(function (input) { return input.value; });

    if (!title) {
      window.showToast("Please enter an expense title.", "error");
      return;
    }
    if (!isFinite(amount) || amount <= 0) {
      window.showToast("Please enter a valid amount greater than zero.", "error");
      return;
    }
    if (!paidById || !payer) {
      window.showToast("Please choose which member paid.", "error");
      return;
    }
    if (!splitBetween.length) {
      window.showToast("Please select at least one person to split the expense with.", "error");
      return;
    }

    const payload = {
      title: title,
      amount: amount,
      category: category,
      date: date,
      paymentStatus: paymentStatus,
      paidById: paidById,
      paidByName: payer.fullName,
      splitType: "equal",
      splitBetween: splitBetween,
      splitMembers: splitBetween,
      description: description
    };

    if (els.saveButton) {
      els.saveButton.disabled = true;
      els.saveButton.textContent = id ? "Updating…" : "Saving…";
    }

    try {
      if (id) {
        await window.chroniclesData.updateExpense(id, payload);
        window.showToast("Expense updated in the shared ledger.", "success");
      } else {
        await window.chroniclesData.addExpense(payload);
        window.showToast("Expense added and splits updated.", "success");
      }
      closeModal();
    } catch (error) {
      window.showToast(error.message, "error");
    } finally {
      if (els.saveButton) {
        els.saveButton.disabled = false;
        els.saveButton.textContent = id ? "Update Expense" : "Save Expense";
      }
    }
  }

  function openCategoriesModal() {
    if (!isManager()) return;
    if (els.categoriesInput) els.categoriesInput.value = categories.join("\n");
    if (els.categoriesModal) els.categoriesModal.classList.remove("hidden");
  }

  function closeCategoriesModal() {
    if (els.categoriesModal) els.categoriesModal.classList.add("hidden");
  }

  async function saveCategories() {
    if (!isManager()) return;
    const lines = els.categoriesInput
      ? els.categoriesInput.value.split(/\r?\n|,/).map(function (line) { return line.trim(); }).filter(Boolean)
      : [];
    if (!lines.length) {
      window.showToast("Please keep at least one category.", "error");
      return;
    }
    if (els.saveCategoriesButton) {
      els.saveCategoriesButton.disabled = true;
      els.saveCategoriesButton.textContent = "Saving…";
    }
    try {
      categories = await window.chroniclesData.saveExpenseCategories(lines);
      window.showToast("Expense categories updated.", "success");
      closeCategoriesModal();
      fillCategoryOptions(categories[0]);
    } catch (error) {
      window.showToast(error.message, "error");
    } finally {
      if (els.saveCategoriesButton) {
        els.saveCategoriesButton.disabled = false;
        els.saveCategoriesButton.textContent = "Save Categories";
      }
    }
  }

  function wireEvents() {
    if (els.addButton) els.addButton.addEventListener("click", openAddModal);
    if (els.cancelButton) els.cancelButton.addEventListener("click", closeModal);
    if (els.form) els.form.addEventListener("submit", handleSubmit);
    if (els.categoriesButton) els.categoriesButton.addEventListener("click", openCategoriesModal);

    const cancelCategories = document.getElementById("cancel-categories-btn");
    const cancelCategories2 = document.getElementById("cancel-categories-btn-2");
    if (cancelCategories) cancelCategories.addEventListener("click", closeCategoriesModal);
    if (cancelCategories2) cancelCategories2.addEventListener("click", closeCategoriesModal);
    if (els.saveCategoriesButton) els.saveCategoriesButton.addEventListener("click", saveCategories);

    window.addEventListener("chronicles:expenseCategoriesUpdated", function (event) {
      const next = event.detail && event.detail.categories;
      if (Array.isArray(next) && next.length) {
        categories = next;
        fillCategoryOptions(els.category ? els.category.value : categories[0]);
      }
    });

    window.addEventListener("chronicles:membersChanged", function () {
      if (els.modal && els.modal.classList.contains("hidden")) {
        fillMemberOptions(null, null);
      }
      renderAll();
    });

    window.addEventListener("chronicles:authChanged", function () {
      renderAll();
    });
  }

  function subscribe() {
    if (unsubscribeExpenses) {
      unsubscribeExpenses();
      unsubscribeExpenses = null;
    }
    unsubscribeExpenses = window.chroniclesData.subscribeExpenses(function (items) {
      expenses = items || [];
      renderAll();
    });
  }

  async function init() {
    if (window.authService) {
      await window.authService.ready;
    }
    categories = await window.chroniclesData.getExpenseCategories();
    wireEvents();
    if (els.date) els.date.value = todayIso();
    renderAll();
    subscribe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
