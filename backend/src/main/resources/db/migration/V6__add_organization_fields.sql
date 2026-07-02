-- Migration: V6__add_organization_fields.sql
ALTER TABLE documents ADD COLUMN favorite BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE documents ADD COLUMN tags VARCHAR(500) DEFAULT '';
