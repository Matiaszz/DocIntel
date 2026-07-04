package com.docintel.shared.contracts;

public interface EmailSender {
    void sendEmail(String to, String subject, String body);
}
