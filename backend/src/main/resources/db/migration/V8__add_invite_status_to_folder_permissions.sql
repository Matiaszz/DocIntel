-- Migration: V8__add_invite_status_to_folder_permissions.sql
ALTER TABLE folder_permissions ADD COLUMN invite_status VARCHAR(50) NOT NULL DEFAULT 'ACCEPTED';
