package com.docintel.shared.infrastructure.cloud.azure;

import com.docintel.shared.contracts.EmailSender;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
        name = "cloud.email.provider",
        havingValue = "azure"
)
public class AzureEmailSender implements EmailSender {
    @Override
    public void sendEmail(String to, String subject, String body) {
        throw new UnsupportedOperationException("Azure Email Sender is not implemented.");
    }
}
