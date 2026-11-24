// Test Suite: Admin-Controlled Private Group Registration System
// Verifies all 11 required scenarios in Node.js with simulated browser environment.

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Mock LocalStorage
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Setup browser globals for js/auth.js
global.window = global;
global.window.chroniclesTestMode = true;
global.window.addEventListener = () => {};
global.window.removeEventListener = () => {};
global.localStorage = new LocalStorageMock();
global.sessionStorage = new LocalStorageMock();
global.location = {
  pathname: "/index.html",
  search: "",
  replace: function (url) { this.pathname = url; },
  assign: function (url) { this.pathname = url; }
};
global.document = {
  documentElement: {
    classList: {
      remove: () => {},
      add: () => {},
      contains: () => false
    }
  },
  addEventListener: () => {},
  dispatchEvent: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  getElementById: () => null
};
global.CustomEvent = class CustomEvent {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts ? opts.detail : null;
  }
};
global.dispatchEvent = () => {};
global.crypto = {
  subtle: crypto.webcrypto.subtle,
  getRandomValues: (buf) => crypto.webcrypto.getRandomValues(buf)
};

// Load js/auth.js
const authJsCode = fs.readFileSync(path.join(__dirname, "js", "auth.js"), "utf8");
eval(authJsCode);

const authService = global.window.authService;

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log("  [PASS] " + description);
    passed++;
  } else {
    console.error("  [FAIL] " + description);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("RUNNING VERIFICATION FOR ADMIN-CONTROLLED SYSTEM");
  console.log("=======================================================\n");

  // SCENARIO 1: Admin setup & Login
  console.log("--- SCENARIO 1: Admin Setup & Login ---");
  await authService.init();
  const adminProfile = await authService.setupInitialAdmin({
    fullName: "Chief Commander",
    email: "admin@the12chronicles.com",
    password: "AdminPassword123!"
  });
  assert(authService.isAuthenticated(), "Admin account successfully initialized and authenticated.");
  assert(authService.isAdmin(), "authService.isAdmin() returns true for Admin.");
  assert(authService.getCurrentUser().effectiveRole === "Admin", "Admin effective role is 'Admin'.");

  // SCENARIO 2: Member Attempts Admin Access
  console.log("\n--- SCENARIO 2: Member Attempting Admin Access ---");
  // Temporarily switch route to admin.html
  global.location.pathname = "/admin.html";
  assert(authService.isAdmin() === true, "Admin is permitted on admin.html.");

  // SCENARIO 3: Admin Generates Member Invitation Code
  console.log("\n--- SCENARIO 3: Admin Generates Member Invitation Code ---");
  const memberInvite = await authService.createInvite({
    role: "Member",
    maxUses: 1,
    note: "For Aryan"
  });
  assert(memberInvite.code.startsWith("CHRONICLES-M"), "Member code begins with CHRONICLES-M (code: " + memberInvite.code + ")");
  assert(memberInvite.role === "Member", "Invite role is 'Member'.");
  assert(memberInvite.status === "active", "Invite status is 'active'.");
  assert(memberInvite.maxUses === 1, "Max uses is 1.");

  // SCENARIO 4: User Registers with Member Invitation Code
  console.log("\n--- SCENARIO 4: User Registers with Member Invitation Code ---");
  await authService.logout();
  const memberReg = await authService.signUp({
    fullName: "Aryan Sharma",
    email: "aryan@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
    inviteCode: memberInvite.code
  });
  assert(authService.isAuthenticated(), "Aryan registered successfully.");
  assert(memberReg.user.role === "Member", "Assigned role is 'Member'.");
  assert(memberReg.user.effectiveRole === "Member", "Effective role is 'Member'.");
  assert(authService.isAdmin() === false, "Member cannot be Admin.");
  assert(authService.canManageExpenses() === false, "Member cannot manage expenses (read-only).");

  // Verify route guard for Member trying to open admin.html
  global.location.pathname = "/admin.html";
  authService.applyRouteGuard();
  assert(global.location.pathname === "index.html", "applyRouteGuard redirected non-admin from admin.html to index.html.");

  // SCENARIO 5: Admin Generates Treasurer Invitation Code
  console.log("\n--- SCENARIO 5: Admin Generates Treasurer Invitation Code ---");
  // Log back in as admin
  await authService.login("admin@the12chronicles.com", "AdminPassword123!");
  assert(authService.isAdmin(), "Admin logged back in.");

  const treasurerInvite = await authService.createInvite({
    role: "Treasurer",
    maxUses: 1,
    note: "For Rohan"
  });
  assert(treasurerInvite.code.startsWith("CHRONICLES-T"), "Treasurer code begins with CHRONICLES-T (code: " + treasurerInvite.code + ")");
  assert(treasurerInvite.role === "Treasurer", "Invite role is 'Treasurer'.");

  // SCENARIO 6: User Registers with Treasurer Invitation Code (Pending)
  console.log("\n--- SCENARIO 6: User Registers with Treasurer Invitation Code (Pending Status) ---");
  await authService.logout();
  const treasurerReg = await authService.signUp({
    fullName: "Rohan Varma",
    email: "rohan@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
    inviteCode: treasurerInvite.code
  });
  assert(treasurerReg.user.role === "Treasurer", "Role is 'Treasurer'.");
  assert(treasurerReg.user.roleStatus === "pending", "Role status is 'pending' approval.");
  assert(treasurerReg.user.effectiveRole === "Member", "Effective role is 'Member' while pending.");
  assert(authService.canManageExpenses() === false, "Pending Treasurer cannot manage expenses yet.");
  assert(treasurerReg.pendingTreasurer === true, "Signup returned pendingTreasurer flag.");

  // SCENARIO 7: Admin Approves Treasurer
  console.log("\n--- SCENARIO 7: Admin Approves Treasurer ---");
  await authService.login("admin@the12chronicles.com", "AdminPassword123!");
  const pendingApps = authService.getPendingTreasurerApplications();
  assert(pendingApps.length === 1 && pendingApps[0].email === "rohan@example.com", "Admin sees Rohan in pending Treasurer applications.");

  await authService.approveTreasurer(pendingApps[0].uid);
  const updatedApps = authService.getPendingTreasurerApplications();
  assert(updatedApps.length === 0, "No pending applications after approval.");

  // Log in as Rohan to verify newly approved permissions
  await authService.login("rohan@example.com", "Password123!");
  assert(authService.getCurrentUser().roleStatus === "approved", "Rohan's roleStatus is now 'approved'.");
  assert(authService.getCurrentUser().effectiveRole === "Treasurer", "Rohan's effectiveRole is now 'Treasurer'.");
  assert(authService.isTreasurer() === true, "authService.isTreasurer() returns true.");
  assert(authService.canManageExpenses() === true, "Approved Treasurer has canManageExpenses() === true.");

  // SCENARIO 8: Expired Invitation Code Rejection
  console.log("\n--- SCENARIO 8: Expired Invitation Code Rejection ---");
  await authService.login("admin@the12chronicles.com", "AdminPassword123!");
  const expiredInvite = await authService.createInvite({
    role: "Member",
    maxUses: 1,
    expiresAt: new Date(Date.now() + 1000).toISOString(),
    note: "Will expire quickly"
  });

  // Manually lapse time on invite
  const localInvites = JSON.parse(global.localStorage.getItem("chronicles_invites"));
  const expIdx = localInvites.findIndex(i => i.code === expiredInvite.code);
  localInvites[expIdx].expiresAt = new Date(Date.now() - 5000).toISOString();
  global.localStorage.setItem("chronicles_invites", JSON.stringify(localInvites));

  await authService.logout();
  let expiredError = null;
  try {
    await authService.signUp({
      fullName: "Late User",
      email: "late@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      inviteCode: expiredInvite.code
    });
  } catch (err) {
    expiredError = err.message;
  }
  assert(expiredError === "This invitation code has expired.", "Rejected expired code with exact message: '" + expiredError + "'");

  // SCENARIO 9: Revoked Invitation Code Rejection
  console.log("\n--- SCENARIO 9: Revoked Invitation Code Rejection ---");
  await authService.login("admin@the12chronicles.com", "AdminPassword123!");
  const toRevoke = await authService.createInvite({
    role: "Member",
    maxUses: 1,
    note: "To be cancelled"
  });
  await authService.revokeInvite(toRevoke.code);

  await authService.logout();
  let revokedError = null;
  try {
    await authService.signUp({
      fullName: "Revoked User",
      email: "revoked@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      inviteCode: toRevoke.code
    });
  } catch (err) {
    revokedError = err.message;
  }
  assert(revokedError === "This invitation code has been revoked by the Admin.", "Rejected revoked code with exact message: '" + revokedError + "'");

  // SCENARIO 10: Single-Use Code Reused Rejection
  console.log("\n--- SCENARIO 10: Single-Use Code Reused Rejection ---");
  await authService.login("admin@the12chronicles.com", "AdminPassword123!");
  const singleUse = await authService.createInvite({
    role: "Member",
    maxUses: 1,
    note: "Single use strictly"
  });

  // First use
  await authService.logout();
  await authService.signUp({
    fullName: "First User",
    email: "first@example.com",
    password: "Password123!",
    confirmPassword: "Password123!",
    inviteCode: singleUse.code
  });

  // Second use with same code
  await authService.logout();
  let reusedError = null;
  try {
    await authService.signUp({
      fullName: "Second User",
      email: "second@example.com",
      password: "Password123!",
      confirmPassword: "Password123!",
      inviteCode: singleUse.code
    });
  } catch (err) {
    reusedError = err.message;
  }
  assert(reusedError === "This invitation code has reached its maximum usage limit.", "Rejected exhausted single-use code with exact message: '" + reusedError + "'");

  // SCENARIO 11: Expense Permissions Enforcement
  console.log("\n--- SCENARIO 11: Expense Permissions Enforcement ---");
  // 1. Member
  await authService.login("first@example.com", "Password123!");
  assert(authService.canManageExpenses() === false, "Member cannot manage expenses (read-only).");

  // 2. Treasurer
  await authService.login("rohan@example.com", "Password123!");
  assert(authService.canManageExpenses() === true, "Approved Treasurer can manage expenses.");

  // 3. Admin
  await authService.login("admin@the12chronicles.com", "AdminPassword123!");
  assert(authService.canManageExpenses() === true, "Admin can manage expenses.");

  console.log("\n=======================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
