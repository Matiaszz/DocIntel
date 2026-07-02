-- Migration: V4__add_visibility_and_document_analysis_fields.sql

-- Adiciona a coluna folder_visibility na tabela folders
ALTER TABLE folders
    ADD COLUMN folder_visibility VARCHAR(50) NOT NULL DEFAULT 'PRIVATE';

-- Adiciona as colunas category, analyzed e agent_analysis na tabela documents
ALTER TABLE documents
    ADD COLUMN category VARCHAR(100),
    ADD COLUMN analyzed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN agent_analysis TEXT;
