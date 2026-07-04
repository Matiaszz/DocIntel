package com.docintel.shared.infrastructure.cloud.azure;

import com.docintel.shared.contracts.FileStorage;
import com.docintel.shared.dto.CompletedPartDTO;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.UUID;

@Service
@ConditionalOnProperty(
        name = "cloud.storage.provider",
        havingValue = "azure"
)
public class AzureBlobStorage implements FileStorage {

    @Override
    public InputStream download(String key){
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

    @Override
    public void deleteFile(UUID userId, UUID fileId) {
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

    @Override
    public boolean deleteProfilePicture(UUID userId, UUID fileId) {
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

    @Override
    public String generatePresignedUploadUrl(String key) {
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

    @Override
    public String initiateMultipartUpload(String key) {
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

    @Override
    public String generatePresignedUploadPartUrl(String key, String uploadId, int partNumber) {
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

    @Override
    public void completeMultipartUpload(String key, String uploadId, java.util.List<CompletedPartDTO> parts) {
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

    @Override
    public String generatePresignedDownloadUrl(String key) {
        throw new UnsupportedOperationException("Azure Blob Storage is not implemented.");
    }

}
