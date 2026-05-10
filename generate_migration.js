const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccountPath = './serviceAccountKey.json';

if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ File serviceAccountKey.json tidak ditemukan!");
    console.log("Silakan unduh dari Firebase Console (Project Settings -> Service Accounts -> Generate new private key).");
    console.log("Simpan di root folder proyek dengan nama 'serviceAccountKey.json'.");
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function escapeSql(val) {
    if (val === null || val === undefined || val === "NULL") return "NULL";
    if (typeof val === "number") return val;
    const str = String(val).replace(/'/g, "''");
    return `'${str}'`;
}

async function migrate() {
    let sql = `-- MIGRATION DUMP DARI FIRESTORE\n\n`;

    console.log("⏳ Mengambil data users...");
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
        const d = doc.data();
        const id = escapeSql(doc.id);
        const email = escapeSql(d.email);
        const name = escapeSql(d.name || d.displayName || "");
        const credits = Number(d.credits) || 0;
        const plan = escapeSql(d.plan || 'free');
        
        let created = new Date().toISOString();
        if (d.createdAt) created = d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date(d.createdAt).toISOString();
        created = escapeSql(created);

        sql += `INSERT OR IGNORE INTO users (id, email, name, credits, plan, created_at, updated_at) VALUES (${id}, ${email}, ${name}, ${credits}, ${plan}, ${created}, ${created});\n`;
    }

    console.log("⏳ Mengambil data workspaces...");
    const wsSnap = await db.collection("workspaces").get();
    for (const doc of wsSnap.docs) {
        const d = doc.data();
        const id = escapeSql(doc.id);
        const userId = escapeSql(d.userId || d.user_id);
        const title = escapeSql(d.title);
        const desc = escapeSql(d.description || "");
        
        let created = new Date().toISOString();
        if (d.createdAt) created = d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date(d.createdAt).toISOString();
        created = escapeSql(created);
        
        sql += `INSERT OR IGNORE INTO workspaces (id, user_id, title, description, created_at, updated_at) VALUES (${id}, ${userId}, ${title}, ${desc}, ${created}, ${created});\n`;
    }

    console.log("⏳ Mengambil data reference_chunks (metadata)...");
    // Gunakan .select() agar tidak mengambil array 'chunks' yang sangat berat berisi embedding
    const refSnap = await db.collection("reference_chunks")
        .select('user_id', 'workspace_id', 'notebook_id', 'reference_id', 'document_id', 'document_title', 'author', 'year', 'cloudinary_url', 'created_at')
        .get();
        
    for (const doc of refSnap.docs) {
        const d = doc.data();
        
        const id = escapeSql(doc.id);
        const userId = escapeSql(d.user_id || d.userId);
        const workspaceId = d.workspace_id ? escapeSql(d.workspace_id) : "NULL";
        const notebookId = d.notebook_id ? escapeSql(d.notebook_id) : "NULL";
        const refId = escapeSql(d.reference_id || d.document_id);
        const title = escapeSql(d.document_title || "");
        const author = escapeSql(d.author || "");
        const year = escapeSql(d.year || "");
        const url = d.cloudinary_url ? escapeSql(d.cloudinary_url) : "NULL";
        
        let created = new Date().toISOString();
        if (d.created_at) created = d.created_at.toDate ? d.created_at.toDate().toISOString() : new Date(d.created_at).toISOString();
        if (d.createdAt) created = d.createdAt.toDate ? d.createdAt.toDate().toISOString() : new Date(d.createdAt).toISOString();
        created = escapeSql(created);

        sql += `INSERT OR IGNORE INTO document_metadata (id, user_id, workspace_id, notebook_id, reference_id, document_title, author, year, cloudinary_url, created_at) VALUES (${id}, ${userId}, ${workspaceId}, ${notebookId}, ${refId}, ${title}, ${author}, ${year}, ${url}, ${created});\n`;
    }

    fs.writeFileSync("migration.sql", sql);
    console.log("✅ Berhasil membuat migration.sql!");
    console.log("Jalankan: npx wrangler d1 execute skripzy-db --remote --file=./migration.sql");
}

migrate().catch(console.error);
