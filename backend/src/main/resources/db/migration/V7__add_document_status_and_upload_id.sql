-- Migration: V7__add_document_status_and_upload_id.sql
ALTER TABLE documents ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED';
ALTER TABLE documents ADD COLUMN upload_id VARCHAR(255);
