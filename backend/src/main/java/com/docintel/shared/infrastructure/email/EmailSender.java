package com.docintel.shared.infrastructure.email;

public interface EmailSender {
    void sendEmail(String to, String subject, String body);
}
