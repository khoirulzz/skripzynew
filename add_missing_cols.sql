ALTER TABLE workspaces ADD COLUMN type TEXT;
ALTER TABLE workspaces ADD COLUMN status TEXT DEFAULT 'Draft';
ALTER TABLE workspaces ADD COLUMN topic TEXT;
ALTER TABLE workspaces ADD COLUMN progress INTEGER DEFAULT 0;
ALTER TABLE workspaces ADD COLUMN journalSections TEXT;
