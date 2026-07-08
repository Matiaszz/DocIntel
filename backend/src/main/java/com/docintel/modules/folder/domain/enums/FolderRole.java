package com.docintel.modules.folder.domain.enums;

public enum FolderRole {
    ADMIN, // 0
    EDITOR, // 1
    VIEWER; // 2

    public boolean outranks(FolderRole role)
    {
        return this.ordinal() < role.ordinal();
    }
}
