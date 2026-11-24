// The 12 Chronicles — Trusted invitation and role management.
// All privilege-sensitive writes live here so clients cannot mint Admins,
// consume an invitation more than once, or change their own role.

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();

const db = admin.firestore();
const REGION = "us-central1";
const USERS_COLLECTION = "users";
const INVITES_COLLECTION = "groupInvites";
const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function cleanCode(value) {
  return String(value || "").trim().toUpperCase();
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function assertAdmin(context) {
  if (!context.auth || context.auth.token.admin !== true) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only the group Admin can perform this action."
    );
  }
}

function inviteError(message) {
  return new functions.https.HttpsError("failed-precondition", message);
}

function normalizeRole(value) {
  return value === "Treasurer" ? "Treasurer" : "Member";
}

function isExpired(invite) {
  if (!invite || !invite.expiresAt) return false;
  const expiry = new Date(invite.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry <= Date.now();
}

function isInviteUsable(invite) {
  if (!invite) return false;
  if (invite.status && invite.status !== "active") return false;
  if (isExpired(invite)) return false;
  const maxUses = Math.max(1, Number(invite.maxUses || 1));
  return Number(invite.usageCount || 0) < maxUses;
}

function publicInvite(code, invite) {
  const maxUses = Math.max(1, Number(invite.maxUses || 1));
  const usageCount = Math.max(0, Number(invite.usageCount || 0));
  return {
    code: code,
    role: normalizeRole(invite.role),
    status: invite.status || "active",
    maxUses: maxUses,
    usageCount: usageCount,
    remainingUses: Math.max(0, maxUses - usageCount),
    expiresAt: invite.expiresAt || null
  };
}

function generateCode(role) {
  const prefix = normalizeRole(role) === "Treasurer" ? "CHRONICLES-T" : "CHRONICLES-M";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += INVITE_ALPHABET[crypto.randomInt(0, INVITE_ALPHABET.length)];
  }
  return prefix + code;
}

function callable(handler) {
  return functions.region(REGION).https.onCall(handler);
}

// Unauthenticated, deliberately minimal: validates an invitation and returns
// only the role and remaining uses needed by the registration form.
exports.previewInvite = callable(async (data) => {
  const code = cleanCode(data && data.code);
  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "Enter an invitation code.");
  }

  const snapshot = await db.collection(INVITES_COLLECTION).doc(code).get();
  if (!snapshot.exists) {
    throw inviteError("Invalid invitation code. Please check the code provided by the Admin.");
  }

  const invite = snapshot.data();
  if (invite.status === "revoked") {
    throw inviteError("This invitation code has been revoked by the Admin.");
  }
  if (isExpired(invite)) {
    throw inviteError("This invitation code has expired.");
  }
  const maxUses = Math.max(1, Number(invite.maxUses || 1));
  const usageCount = Number(invite.usageCount || 0);
  if (usageCount >= maxUses) {
    throw inviteError("This invitation code has reached its maximum usage limit.");
  }

  return publicInvite(code, invite);
});

// Authenticated redemption. The caller must already have a Firebase Auth user;
// this function atomically checks the invitation, increments its usage and
// creates the member profile. The client never writes the role fields itself.
exports.redeemInvite = callable(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Please log in first.");
  }

  const code = cleanCode(data && data.code);
  const fullName = cleanText(data && data.fullName, 80);
  const photoURL = cleanText(data && data.photoURL, 400000);
  const email = cleanText(context.auth.token.email, 160).toLowerCase();

  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "Enter an invitation code.");
  }
  if (fullName.length < 2) {
    throw new functions.https.HttpsError("invalid-argument", "Enter your full name.");
  }
  if (!email) {
    throw new functions.https.HttpsError("invalid-argument", "Your account has no email address.");
  }

  const uid = context.auth.uid;
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const inviteRef = db.collection(INVITES_COLLECTION).doc(code);
  const now = new Date().toISOString();

  const result = await db.runTransaction(async (transaction) => {
    const existingUser = await transaction.get(userRef);
    if (existingUser.exists) {
      return { profile: existingUser.data(), alreadyRedeemed: true };
    }

    const inviteSnapshot = await transaction.get(inviteRef);
    if (!inviteSnapshot.exists) {
      throw inviteError("Invalid invitation code. Please check the code provided by the Admin.");
    }

    const invite = inviteSnapshot.data();
    if (invite.status === "revoked") {
      throw inviteError("This invitation code has been revoked by the Admin.");
    }
    if (isExpired(invite)) {
      throw inviteError("This invitation code has expired.");
    }
    const maxUses = Math.max(1, Number(invite.maxUses || 1));
    const usageCount = Number(invite.usageCount || 0);
    if (usageCount >= maxUses) {
      throw inviteError("This invitation code has reached its maximum usage limit.");
    }

    const role = normalizeRole(invite.role);
    const roleStatus = role === "Treasurer" ? "pending" : "approved";
    const usedBy = Array.isArray(invite.usedBy) ? invite.usedBy.slice() : [];
    usedBy.push({
      uid: uid,
      email: email,
      name: fullName,
      at: now
    });

    const profile = {
      uid: uid,
      fullName: fullName,
      email: email,
      photoURL: photoURL || "",
      role: role,
      roleStatus: roleStatus,
      accountStatus: "active",
      nickname: "",
      tripRole: "",
      funFact: "",
      inviteCode: code,
      invitedRole: role,
      createdAt: now,
      updatedAt: now
    };

    transaction.set(userRef, profile);
    transaction.update(inviteRef, {
      usageCount: Number(invite.usageCount || 0) + 1,
      usedBy: usedBy,
      lastUsedAt: now,
      updatedAt: now
    });

    return { profile: profile, alreadyRedeemed: false };
  });

  return {
    profile: result.profile,
    role: normalizeRole(result.profile.role),
    roleStatus: result.profile.roleStatus || "approved",
    alreadyRedeemed: result.alreadyRedeemed
  };
});

// Admin-only invitation creation.
exports.generateInvite = callable(async (data, context) => {
  assertAdmin(context);

  const role = normalizeRole(data && data.role);
  const maxUses = Math.max(1, Math.min(100, Math.floor(Number(data && data.maxUses) || 1)));
  const note = cleanText(data && data.note, 200);
  const expiresAt = data && data.expiresAt ? cleanText(data.expiresAt, 40) : null;

  if (expiresAt && !Number.isFinite(new Date(expiresAt).getTime())) {
    throw new functions.https.HttpsError("invalid-argument", "The expiry date is invalid.");
  }
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    throw new functions.https.HttpsError("invalid-argument", "The expiry date must be in the future.");
  }

  let code = "";
  let inviteRef = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateCode(role);
    const candidateRef = db.collection(INVITES_COLLECTION).doc(candidate);
    const snapshot = await candidateRef.get();
    if (!snapshot.exists) {
      code = candidate;
      inviteRef = candidateRef;
      break;
    }
  }

  if (!inviteRef) {
    throw new functions.https.HttpsError("resource-exhausted", "Could not create a unique code. Try again.");
  }

  const now = new Date().toISOString();
  const invite = {
    code: code,
    role: role,
    status: "active",
    maxUses: maxUses,
    usageCount: 0,
    usedBy: [],
    note: note,
    expiresAt: expiresAt,
    createdAt: now,
    createdBy: context.auth.uid,
    createdByName: cleanText(context.auth.token.name || context.auth.token.email || "Admin", 120),
    updatedAt: now
  };

  await inviteRef.set(invite);
  return invite;
});

// Admin-only revocation. Existing accounts are not deleted; the code simply
// stops working immediately.
exports.revokeInvite = callable(async (data, context) => {
  assertAdmin(context);
  const code = cleanCode(data && data.code);
  if (!code) {
    throw new functions.https.HttpsError("invalid-argument", "Invitation code is required.");
  }

  const inviteRef = db.collection(INVITES_COLLECTION).doc(code);
  const snapshot = await inviteRef.get();
  if (!snapshot.exists) {
    throw new functions.https.HttpsError("not-found", "Invitation not found.");
  }

  const now = new Date().toISOString();
  await inviteRef.update({
    status: "revoked",
    revokedAt: now,
    revokedBy: context.auth.uid,
    updatedAt: now
  });

  return { code: code, status: "revoked" };
});

// Admin-only Treasurer review. Approval keeps the account's invitation-issued
// role; rejection safely downgrades it to an approved Member.
exports.reviewTreasurer = callable(async (data, context) => {
  assertAdmin(context);

  const uid = cleanText(data && data.uid, 128);
  const decision = data && data.decision === "approve" ? "approve" : "reject";
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "Member ID is required.");
  }

  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new functions.https.HttpsError("not-found", "Member not found.");
  }

  const now = new Date().toISOString();
  const approvedByName = cleanText(context.auth.token.name || context.auth.token.email || "Admin", 120);
  const updates = decision === "approve"
    ? {
        role: "Treasurer",
        roleStatus: "approved",
        approvedBy: context.auth.uid,
        approvedByName: approvedByName,
        approvedAt: now,
        updatedAt: now
      }
    : {
        role: "Member",
        roleStatus: "approved",
        approvedBy: context.auth.uid,
        approvedByName: approvedByName,
        approvedAt: now,
        updatedAt: now
      };

  await userRef.update(updates);
  return Object.assign({ uid: uid }, updates);
});

// Admin-only role changes. The Admin role itself cannot be granted here; it is
// provisioned once with the Firebase Admin SDK script.
exports.setMemberRole = callable(async (data, context) => {
  assertAdmin(context);

  const uid = cleanText(data && data.uid, 128);
  const role = data && data.role === "Treasurer" ? "Treasurer" : "Member";
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "Member ID is required.");
  }
  if (uid === context.auth.uid) {
    throw new functions.https.HttpsError("failed-precondition", "You cannot change your own role.");
  }

  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const snapshot = await userRef.get();
  if (!snapshot.exists) {
    throw new functions.https.HttpsError("not-found", "Member not found.");
  }
  if (snapshot.data().role === "Admin") {
    throw new functions.https.HttpsError("failed-precondition", "The Admin account cannot be changed here.");
  }

  const now = new Date().toISOString();
  const updates = {
    role: role,
    roleStatus: "approved",
    approvedBy: context.auth.uid,
    approvedByName: cleanText(context.auth.token.name || context.auth.token.email || "Admin", 120),
    approvedAt: now,
    updatedAt: now
  };
  await userRef.update(updates);
  return Object.assign({ uid: uid }, updates);
});

// Secure one-time Admin setup function: can only be called if no Admin account exists yet.
// If an Admin already exists, this function strictly rejects any caller.
exports.setupInitialAdmin = callable(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "You must be signed in with your credentials to initialize Admin access.");
  }

  const callerUid = context.auth.uid;
  const callerEmail = cleanText(context.auth.token.email, 160).toLowerCase();

  // Check if an active Admin already exists in Firestore
  const adminUsers = await db.collection(USERS_COLLECTION).where("role", "==", "Admin").get();
  const existingActiveAdmin = adminUsers.docs.find((doc) => {
    const docData = doc.data() || {};
    return docData.accountStatus === "active" && docData.roleStatus === "approved";
  });

  if (existingActiveAdmin) {
    if (existingActiveAdmin.id === callerUid) {
      // Re-assert custom claim for current Admin if missing
      await admin.auth().setCustomUserClaims(callerUid, { admin: true });
      return { success: true, message: "Existing Admin account verified and claims refreshed." };
    }
    throw new functions.https.HttpsError(
      "already-exists",
      "An Admin account is already configured for this website. Only one Admin is permitted."
    );
  }

  // Grant the server-side custom claim
  const now = new Date().toISOString();
  await admin.auth().setCustomUserClaims(callerUid, { admin: true });

  const userRef = db.collection(USERS_COLLECTION).doc(callerUid);
  const userSnap = await userRef.get();
  const fullName = cleanText(data && data.fullName, 80) ||
    cleanText(context.auth.token.name, 80) ||
    (userSnap.exists ? userSnap.data().fullName : "") ||
    callerEmail.split("@")[0];

  const adminProfile = {
    uid: callerUid,
    fullName: fullName,
    email: callerEmail,
    photoURL: cleanText(data && data.photoURL, 400000) || (userSnap.exists ? userSnap.data().photoURL || "" : ""),
    role: "Admin",
    roleStatus: "approved",
    accountStatus: "active",
    nickname: (userSnap.exists ? userSnap.data().nickname : "") || "Trip Admin",
    tripRole: (userSnap.exists ? userSnap.data().tripRole : "") || "Trip Leader & Organizer",
    funFact: (userSnap.exists ? userSnap.data().funFact : "") || "Website Owner & Group Admin",
    createdAt: userSnap.exists && userSnap.data().createdAt ? userSnap.data().createdAt : now,
    updatedAt: now
  };

  await userRef.set(adminProfile, { merge: true });

  return {
    success: true,
    message: "Admin account setup completed successfully. You are now the sole Admin.",
    profile: adminProfile
  };
});
