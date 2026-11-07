// The 12 Chronicles — Group Expense Tracker & Smart Debt Settlement Engine

(function () {
  let expenses = [];
  const squad = window.authService.getAllMembers();

  const totalExpenseEl = document.getElementById('total-trip-expenses');
  const perPersonAvgEl = document.getElementById('per-person-avg');
  const userBalanceEl = document.getElementById('user-balance');
  const expenseListEl = document.getElementById('expense-list');
  const memberBalancesEl = document.getElementById('member-balances-grid');
  const debtsSummaryEl = document.getElementById('debts-summary-list');

  // Modal elements
  const addExpenseBtn = document.getElementById('open-add-expense-btn');
  const expenseModal = document.getElementById('expense-modal');
  const cancelExpenseBtn = document.getElementById('cancel-expense-btn');
  const expenseForm = document.getElementById('expense-form');
  const payerSelect = document.getElementById('exp-payer-select');
  const splitMembersContainer = document.getElementById('split-members-checkboxes');

  async function loadExpenses() {
    expenses = await window.chroniclesData.getExpenses();
    renderSummary();
    renderExpenseList();
    calculateBalancesAndDebts();
  }

  // Calculate high-level totals
  function renderSummary() {
    const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const avg = squad.length > 0 ? Math.round(total / squad.length) : 0;

    if (totalExpenseEl) totalExpenseEl.innerText = `₹${total.toLocaleString('en-IN')}`;
    if (perPersonAvgEl) perPersonAvgEl.innerText = `₹${avg.toLocaleString('en-IN')}`;

    // Current logged-in member balance
    const currentUser = window.authService.getCurrentUser();
    if (userBalanceEl && currentUser) {
      let paidByMe = 0;
      let myShare = 0;

      expenses.forEach(exp => {
        const amt = Number(exp.amount || 0);
        if (exp.paidById === currentUser.id) {
          paidByMe += amt;
        }
        const splitCount = (exp.splitMembers && exp.splitMembers.length > 0) ? exp.splitMembers.length : squad.length;
        if (!exp.splitMembers || exp.splitMembers.includes(currentUser.id)) {
          myShare += (amt / splitCount);
        }
      });

      const net = Math.round(paidByMe - myShare);
      if (net > 0) {
        userBalanceEl.innerHTML = `<span class="text-green-700 font-bold">+₹${net.toLocaleString('en-IN')}</span> <span class="text-xs text-green-600 block">(You are owed)</span>`;
      } else if (net < 0) {
        userBalanceEl.innerHTML = `<span class="text-red-700 font-bold">-₹${Math.abs(net).toLocaleString('en-IN')}</span> <span class="text-xs text-red-600 block">(You owe squad)</span>`;
      } else {
        userBalanceEl.innerHTML = `<span class="text-[#282824] font-bold">₹0</span> <span class="text-xs text-[#A4A88A] block">(Settled up)</span>`;
      }
    }
  }

  // Render Expense History list
  function renderExpenseList() {
    if (!expenseListEl) return;

    if (expenses.length === 0) {
      expenseListEl.innerHTML = `
        <div class="text-center py-12 bg-white rounded-xl border border-[#A4A88A]/30 p-6">
          <p class="font-serif text-base font-bold text-[#282824]">No expenses logged yet</p>
          <p class="text-xs text-[#282824]/60 mt-1">Add your tickets, hotel advance, or dinner bills using the button above.</p>
        </div>
      `;
      return;
    }

    const categoryIcons = {
      Travel: '🚂',
      Hotel: '🏨',
      Food: '🍲',
      Sightseeing: '🎟️',
      Shopping: '🛍️',
      Other: '🧾'
    };

    expenseListEl.innerHTML = expenses.map(exp => {
      const payer = window.authService.getMemberById(exp.paidById);
      const icon = categoryIcons[exp.category] || '💰';
      const splitLength = exp.splitMembers ? exp.splitMembers.length : squad.length;

      return `
        <div class="journal-card p-4 flex items-center justify-between gap-4 bg-white border border-[#A4A88A]/30">
          <div class="flex items-center gap-3.5 flex-1 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-[#F7F4EC] border border-[#A4A88A]/30 flex items-center justify-center text-lg flex-shrink-0">
              ${icon}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded bg-[#354B3A]/10 text-[#354B3A]">
                  ${exp.category}
                </span>
                <span class="text-[11px] text-[#A4A88A]">${exp.date}</span>
              </div>
              <h4 class="font-serif font-bold text-sm text-[#282824] truncate">${exp.title}</h4>
              <p class="text-xs text-[#282824]/70">
                Paid by <strong class="text-[#282824]">${exp.paidByName || (payer ? payer.name : 'Squad')}</strong> • Split equally amongst ${splitLength} friends
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <div class="text-right">
              <span class="font-serif font-bold text-base text-[#282824]">₹${Number(exp.amount).toLocaleString('en-IN')}</span>
              <span class="text-[10px] text-[#A4A88A] block">₹${Math.round(exp.amount / splitLength)} / person</span>
            </div>
            <button data-delete-exp="${exp.id}" class="text-gray-300 hover:text-red-500 p-1" title="Delete Expense">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    expenseListEl.querySelectorAll('[data-delete-exp]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-delete-exp');
        if (confirm('Delete this expense entry?')) {
          await window.chroniclesData.deleteExpense(id);
          window.showToast('Expense removed', 'info');
          loadExpenses();
        }
      });
    });
  }

  // Calculate Net Balances and Simplified Debts
  function calculateBalancesAndDebts() {
    // 1. Calculate each member's net balance: paid - owed
    const netBalances = {};
    squad.forEach(m => {
      netBalances[m.id] = 0;
    });

    expenses.forEach(exp => {
      const amt = Number(exp.amount || 0);
      const payerId = exp.paidById;
      const participants = (exp.splitMembers && exp.splitMembers.length > 0) ? exp.splitMembers : squad.map(m => m.id);
      const splitAmount = amt / participants.length;

      if (netBalances[payerId] !== undefined) {
        netBalances[payerId] += amt;
      }

      participants.forEach(pid => {
        if (netBalances[pid] !== undefined) {
          netBalances[pid] -= splitAmount;
        }
      });
    });

    // Render individual contribution grid
    if (memberBalancesEl) {
      memberBalancesEl.innerHTML = squad.map(member => {
        const net = Math.round(netBalances[member.id] || 0);
        return `
          <div class="journal-card p-4 flex items-center justify-between gap-3 bg-white border border-[#A4A88A]/30">
            <div class="flex items-center gap-2.5 min-w-0">
              <img src="${member.avatar}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" />
              <div class="truncate">
                <p class="text-xs font-bold text-[#282824] truncate">${member.name}</p>
                <p class="text-[10px] text-[#A4A88A] truncate">${member.nickname}</p>
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-bold ${net > 0 ? 'text-green-700' : net < 0 ? 'text-red-700' : 'text-gray-500'}">
                ${net > 0 ? `+₹${net.toLocaleString('en-IN')}` : net < 0 ? `-₹${Math.abs(net).toLocaleString('en-IN')}` : '₹0'}
              </span>
              <span class="text-[9px] uppercase tracking-wider text-[#A4A88A] block">
                ${net > 0 ? 'Gets back' : net < 0 ? 'Owes squad' : 'Settled'}
              </span>
            </div>
          </div>
        `;
      }).join('');
    }

    // 2. Greedy Debt Simplification Algorithm
    // Separate creditors (positive net) and debtors (negative net)
    const creditors = [];
    const debtors = [];

    Object.keys(netBalances).forEach(id => {
      const balance = Math.round(netBalances[id]);
      if (balance > 1) {
        creditors.push({ id, amount: balance });
      } else if (balance < -1) {
        debtors.push({ id, amount: -balance });
      }
    });

    // Sort descending
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const simplifiedTransactions = [];
    let cIdx = 0;
    let dIdx = 0;

    while (cIdx < creditors.length && dIdx < debtors.length) {
      const creditor = creditors[cIdx];
      const debtor = debtors[dIdx];
      const settleAmount = Math.min(creditor.amount, debtor.amount);

      if (settleAmount > 1) {
        simplifiedTransactions.push({
          from: debtor.id,
          to: creditor.id,
          amount: settleAmount
        });
      }

      creditor.amount -= settleAmount;
      debtor.amount -= settleAmount;

      if (creditor.amount <= 1) cIdx++;
      if (debtor.amount <= 1) dIdx++;
    }

    // Render debts summary
    if (debtsSummaryEl) {
      if (simplifiedTransactions.length === 0) {
        debtsSummaryEl.innerHTML = `
          <div class="p-4 bg-green-50 border border-green-200 rounded-xl text-center text-xs text-green-800">
            🎉 All squad expenses are completely balanced! No pending settlements.
          </div>
        `;
      } else {
        debtsSummaryEl.innerHTML = simplifiedTransactions.map(tx => {
          const fromMember = window.authService.getMemberById(tx.from);
          const toMember = window.authService.getMemberById(tx.to);

          return `
            <div class="flex items-center justify-between p-3.5 bg-[#F7F4EC] rounded-xl border border-[#A4A88A]/30 text-xs">
              <div class="flex items-center gap-2">
                <img src="${fromMember ? fromMember.avatar : ''}" class="w-6 h-6 rounded-full object-cover" />
                <span class="font-bold text-[#282824]">${fromMember ? fromMember.name.split(' ')[0] : 'Member'}</span>
                <span class="text-[#A4A88A]">owes</span>
                <img src="${toMember ? toMember.avatar : ''}" class="w-6 h-6 rounded-full object-cover" />
                <span class="font-bold text-[#354B3A]">${toMember ? toMember.name.split(' ')[0] : 'Member'}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="font-serif font-bold text-sm text-[#C76B4A]">₹${tx.amount.toLocaleString('en-IN')}</span>
                <button onclick="window.showToast('Settlement reminder sent via WhatsApp UPI link!', 'success')" 
                        class="px-2 py-1 rounded bg-[#354B3A] hover:bg-[#243428] text-white text-[10px] font-semibold transition-colors">
                  UPI Settle
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  // Add Expense Modal
  function initExpenseModal() {
    if (payerSelect) {
      payerSelect.innerHTML = squad.map(m => `
        <option value="${m.id}">${m.name} (${m.nickname})</option>
      `).join('');
    }

    if (splitMembersContainer) {
      splitMembersContainer.innerHTML = squad.map(m => `
        <label class="flex items-center gap-2 text-xs text-[#282824] cursor-pointer">
          <input type="checkbox" name="split-member" value="${m.id}" checked class="journal-checkbox" />
          <span>${m.name.split(' ')[0]}</span>
        </label>
      `).join('');
    }

    if (addExpenseBtn && expenseModal) {
      addExpenseBtn.addEventListener('click', () => {
        expenseModal.classList.remove('hidden');
      });
    }

    if (cancelExpenseBtn && expenseModal) {
      cancelExpenseBtn.addEventListener('click', () => {
        expenseModal.classList.add('hidden');
        expenseForm.reset();
      });
    }

    if (expenseForm) {
      expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('exp-title').value.trim();
        const amount = parseFloat(document.getElementById('exp-amount').value);
        const category = document.getElementById('exp-category').value;
        const paidById = payerSelect.value;
        const payer = window.authService.getMemberById(paidById);

        const checkedCheckboxes = splitMembersContainer.querySelectorAll('input[type="checkbox"]:checked');
        const splitMembers = Array.from(checkedCheckboxes).map(cb => cb.value);

        if (splitMembers.length === 0) {
          window.showToast('Please select at least 1 person to split the expense with.', 'error');
          return;
        }

        await window.chroniclesData.addExpense({
          title,
          amount,
          category,
          paidById,
          paidByName: payer ? payer.name : 'Squad',
          splitType: 'equal',
          splitMembers
        });

        expenseModal.classList.add('hidden');
        expenseForm.reset();
        window.showToast('Expense added and splits updated!', 'success');
        loadExpenses();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    initExpenseModal();
    loadExpenses();

    window.addEventListener('chronicles:authChanged', () => {
      renderSummary();
    });

    window.addEventListener('chronicles:expensesUpdated', () => {
      loadExpenses();
    });
  });
})();
