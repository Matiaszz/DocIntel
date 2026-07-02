package com.docintel.shared.infrastructure.storage.providers;

import com.docintel.shared.infrastructure.storage.FileStorage;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.UUID;

@Service
@ConditionalOnProperty(
        name = "cloud.storage.provider",
        havingValue = "azure"
)
public class AzureBlobStorage implements FileStorage {
    @Override
    public boolean uploadFile(MultipartFile file, UUID userId, UUID fileId) {
        return false;
    }

    @Override
    public boolean uploadProfilePicture(MultipartFile file, UUID userId, UUID fileId) {
        return false;
    }

    @Override
    public InputStream download(String key) {
        return null;
    }

    @Override
    public boolean deleteFile(UUID userId, UUID fileId) {
        return false;
    }

    @Override
    public boolean deleteProfilePicture(UUID userId, UUID fileId) {
        return false;
    }

}
