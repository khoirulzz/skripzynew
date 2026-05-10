-- 1. Tambahkan kolom editor ke tabel workspaces
ALTER TABLE workspaces ADD COLUMN bab1 TEXT DEFAULT '';
ALTER TABLE workspaces ADD COLUMN bab2 TEXT DEFAULT '';
ALTER TABLE workspaces ADD COLUMN bab3 TEXT DEFAULT '';
ALTER TABLE workspaces ADD COLUMN bab4 TEXT DEFAULT '';
ALTER TABLE workspaces ADD COLUMN bab5 TEXT DEFAULT '';
ALTER TABLE workspaces ADD COLUMN bab6 TEXT DEFAULT '';
ALTER TABLE workspaces ADD COLUMN activeChapter INTEGER DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN referenceCount INTEGER DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN responseCount INTEGER DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN methodologyType TEXT DEFAULT 'kuantitatif';
ALTER TABLE workspaces ADD COLUMN activeFormId TEXT;

-- 2. Buat tabel-tabel pendukung
CREATE TABLE IF NOT EXISTS workspace_references (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    title TEXT,
    authorString TEXT,
    year TEXT,
    pdfUrl TEXT,
    venue TEXT,
    chunkCount INTEGER DEFAULT 0,
    fileName TEXT,
    notes TEXT,
    chapterKeys TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_forms (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    title TEXT,
    status TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_transcripts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_analysis (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    narrative TEXT,
    responseCount INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT NOT NULL,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
