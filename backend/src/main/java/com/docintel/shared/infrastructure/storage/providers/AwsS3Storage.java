package com.docintel.shared.infrastructure.storage.providers;

import com.docintel.shared.infrastructure.storage.CompletedPartDTO;
import com.docintel.shared.infrastructure.storage.FileStorage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.*;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RequiredArgsConstructor
@Service
@ConditionalOnProperty(
        name = "cloud.storage.provider",
        havingValue = "aws"
)
public class AwsS3Storage implements FileStorage {
    @Value("${cloud.aws.s3.bucket.name}")
    private String bucketName;

    private final S3Client s3;
    private final S3Presigner s3Presigner;


    @Override
    public boolean uploadFile(MultipartFile file, UUID userId, UUID fileId) {
        try {
            String fileName = file.getOriginalFilename();

            if (fileName == null){
                throw new IOException("Filename is null.");
            }

            String key = resolveFileKey(fileId, fileName);

            // S3 user-defined metadata values must be US-ASCII. Non-ASCII characters (like accents or spaces) will corrupt Signature Version 4.
            String encodedFileName = java.net.URLEncoder.encode(fileName, java.nio.charset.StandardCharsets.UTF_8);
            Map<String, String> metadata = Map.of(
                    "fileId", fileId.toString(),
                    "originalFilename", encodedFileName
            );

            putFile(key, file.getBytes(), metadata);

            return true;
        } catch (IOException e){
            log.error(e.getMessage());
            return false;
        }
    }

    @Override
    public boolean uploadProfilePicture(MultipartFile file, UUID userId, UUID fileId) {
        try {
            String key = resolvePictureKey(userId, fileId);
            Map<String, String> metadata = Map.of(
                    "fileId", fileId.toString()
            );

            putFile(key, file.getBytes(), metadata);

            return true;
        } catch (IOException e){
            log.error(e.getMessage());
            return false;
        }
    }

    @Override
    public InputStream download(String key) {
        try {
            return s3.getObject(
                    GetObjectRequest.builder()
                            .bucket(bucketName)
                            .key(key)
                            .build()
            );
        } catch (Exception e) {
            log.error("Failed to download file from S3. Key: {}, Error: {}", key, e.getMessage());
            return null;
        }
    }

    @Override
    public void deleteFile(UUID userId, UUID fileId) {
        try {
            String prefix = "documents/" + fileId.toString() + "_";
            ListObjectsV2Response listResponse = s3.listObjectsV2(
                    ListObjectsV2Request.builder()
                            .bucket(bucketName)
                            .prefix(prefix)
                            .build()
            );

            listResponse.contents().forEach(object -> {
                deleteFile(object.key());
            });
        } catch (Exception e) {
            log.error("Failed to delete file from S3. FileId: {}, Error: {}", fileId, e.getMessage());
        }
    }

    @Override
    public boolean deleteProfilePicture(UUID userId, UUID fileId) {
        try {
            String key = resolvePictureKey(userId, fileId);
            deleteFile(key);
            return true;
        } catch (Exception e) {
            log.error("Failed to delete profile picture from S3. FileId: {}, Error: {}", fileId, e.getMessage());
            return false;
        }
    }

    @Override
    public String generatePresignedUploadUrl(String key) {
        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        PutObjectPresignRequest putObjectPresignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedPutObjectRequest = s3Presigner.presignPutObject(putObjectPresignRequest);
        return presignedPutObjectRequest.url().toString();
    }

    @Override
    public String initiateMultipartUpload(String key) {
        CreateMultipartUploadRequest createMultipartUploadRequest = CreateMultipartUploadRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        CreateMultipartUploadResponse response = s3.createMultipartUpload(createMultipartUploadRequest);
        return response.uploadId();
    }

    @Override
    public String generatePresignedUploadPartUrl(String key, String uploadId, int partNumber) {
        UploadPartRequest uploadPartRequest = UploadPartRequest.builder()
                .bucket(bucketName)
                .key(key)
                .uploadId(uploadId)
                .partNumber(partNumber)
                .build();

        UploadPartPresignRequest uploadPartPresignRequest = UploadPartPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .uploadPartRequest(uploadPartRequest)
                .build();

        PresignedUploadPartRequest presignedUploadPartRequest = s3Presigner.presignUploadPart(uploadPartPresignRequest);
        return presignedUploadPartRequest.url().toString();
    }

    @Override
    public void completeMultipartUpload(String key, String uploadId, List<CompletedPartDTO> parts) {
        List<CompletedPart> completedParts = parts.stream()
                .map(part -> CompletedPart.builder()
                        .partNumber(part.partNumber())
                        .eTag(part.eTag())
                        .build())
                .collect(Collectors.toList());

        CompletedMultipartUpload completedMultipartUpload = CompletedMultipartUpload.builder()
                .parts(completedParts)
                .build();

        CompleteMultipartUploadRequest completeMultipartUploadRequest = CompleteMultipartUploadRequest.builder()
                .bucket(bucketName)
                .key(key)
                .uploadId(uploadId)
                .multipartUpload(completedMultipartUpload)
                .build();

        s3.completeMultipartUpload(completeMultipartUploadRequest);
    }

    @Override
    public String generatePresignedDownloadUrl(String key) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest getObjectPresignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedGetObjectRequest = s3Presigner.presignGetObject(getObjectPresignRequest);
        return presignedGetObjectRequest.url().toString();
    }

    private void deleteFile(String key){
        s3.deleteObject(
                DeleteObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build()
        );
    }

    private void putFile(String key, byte[] content, Map<String, String> metadata) {
        s3.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .metadata(metadata)
                        .build(), RequestBody.fromBytes(content)
        );
    }
}
