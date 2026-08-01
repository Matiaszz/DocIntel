package com.docintel.shared.infrastructure.cloud.contracts;

public interface EmailSender {
    void sendEmail(String to, String subject, String body);
}
