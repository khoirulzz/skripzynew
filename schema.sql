DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    credits INTEGER DEFAULT 0,
    plan TEXT DEFAULT 'free',
    role TEXT DEFAULT 'user',
    status TEXT,
    asalInstitusi TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS workspaces;
CREATE TABLE workspaces (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    type TEXT,
    status TEXT DEFAULT 'Draft',
    topic TEXT,
    progress INTEGER DEFAULT 0,
    bab1 TEXT DEFAULT '',
    bab2 TEXT DEFAULT '',
    bab3 TEXT DEFAULT '',
    bab4 TEXT DEFAULT '',
    bab5 TEXT DEFAULT '',
    bab6 TEXT DEFAULT '',
    activeChapter INTEGER DEFAULT 0,
    referenceCount INTEGER DEFAULT 0,
    responseCount INTEGER DEFAULT 0,
    methodologyType TEXT DEFAULT 'kuantitatif',
    activeFormId TEXT,
    journalSections TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

DROP TABLE IF EXISTS document_metadata;
CREATE TABLE document_metadata (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    workspace_id TEXT,
    notebook_id TEXT,
    reference_id TEXT,
    document_title TEXT NOT NULL,
    author TEXT,
    year TEXT,
    cloudinary_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- Indexes for faster queries
CREATE INDEX idx_workspaces_user_id ON workspaces(user_id);
CREATE INDEX idx_document_metadata_user_id ON document_metadata(user_id);
CREATE INDEX idx_document_metadata_workspace_id ON document_metadata(workspace_id);
CREATE INDEX idx_document_metadata_reference_id ON document_metadata(reference_id);
