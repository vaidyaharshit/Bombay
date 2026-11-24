// One-time Admin provisioning for The 12 Chronicles.
//
// Usage (from the functions directory):
//   set GOOGLE_APPLICATION_CREDENTIALS=path\to\service-account.json
//   node scripts/set-admin-claim.js admin@example.com
//
// Or pass the key path explicitly:
//   node scripts/set-admin-claim.js admin@example.com --service-account path\to\service-account.json
//
// The service account key is a secret. Never commit it to the repository.

const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? "" : String(process.argv[index + 1] || "");
}

function findServiceAccountKey() {
  const explicit = argumentValue("--service-account") || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (explicit && fs.existsSync(path.resolve(explicit))) {
    return path.resolve(explicit);
  }

  // Look for common file names in project root or functions folder
  const searchDirs = [
    path.resolve(__dirname, "..", ".."), // Project root (E:\Bombay)
    path.resolve(__dirname, ".."),       // functions folder (E:\Bombay\functions)
    process.cwd()
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const defaultKey = path.join(dir, "service-account.json");
    if (fs.existsSync(defaultKey)) return defaultKey;

    try {
      const files = fs.readdirSync(dir);
      const match = files.find(f => (f.startsWith("service-account") || f.includes("-firebase-adminsdk-")) && f.endsWith(".json"));
      if (match) {
        return path.join(dir, match);
      }
    } catch (e) {
      // ignore read errors
    }
  }

  return explicit ? path.resolve(explicit) : "";
}

async function main() {
  const email = String(process.argv[2] || "").trim().toLowerCase();
  const keyPath = findServiceAccountKey();

  if (!email || email.indexOf("--") === 0) {
    console.error("Usage: node functions/scripts/set-admin-claim.js <admin-email> [--service-account <key.json>]");
    process.exit(1);
  }
  if (!keyPath || !fs.existsSync(keyPath)) {
    console.error("Firebase Service Account key not found.");
    console.error("Please place your downloaded service-account.json in the project root (E:\\Bombay\\service-account.json)");
    console.error("or pass its path explicitly: node functions/scripts/set-admin-claim.js " + email + " --service-account <path-to-key.json>");
    process.exit(1);
  }

  console.log("Using service account key: " + keyPath);
  console.log("Setting Admin privileges for: " + email + "...");

  admin.initializeApp({
    credential: admin.credential.cert(require(resolvedKeyPath))
  });

  const auth = admin.auth();
  const db = admin.firestore();
  const user = await auth.getUserByEmail(email);
  const existingClaims = user.customClaims || {};
  const now = new Date().toISOString();

  await auth.setCustomUserClaims(user.uid, Object.assign({}, existingClaims, {
    admin: true
  }));

  const profileRef = db.collection("users").doc(user.uid);
  const profileSnapshot = await profileRef.get();
  const fullName = (user.displayName || (profileSnapshot.exists && profileSnapshot.data().fullName) || email.split("@")[0]).trim();

  await profileRef.set({
    uid: user.uid,
    fullName: fullName,
    email: email,
    photoURL: user.photoURL || (profileSnapshot.exists ? profileSnapshot.data().photoURL || "" : ""),
    role: "Admin",
    roleStatus: "approved",
    accountStatus: "active",
    updatedAt: now
  }, { merge: true });

  console.log("Admin custom claim granted to " + email + " (" + user.uid + ").");
  console.log("The user must sign out and sign in again (or refresh their ID token) for the claim to take effect.");
}

main().catch(function (error) {
  console.error("Could not grant Admin access:", error.message || error);
  process.exit(1);
});
