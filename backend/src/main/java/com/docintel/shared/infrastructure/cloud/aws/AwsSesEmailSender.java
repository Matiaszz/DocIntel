package com.docintel.shared.infrastructure.cloud.aws;

import com.docintel.shared.contracts.EmailSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.ses.model.*;

@Slf4j
@RequiredArgsConstructor
@Service
@ConditionalOnProperty(
        name = "cloud.email.provider",
        havingValue = "aws"
)
public class AwsSesEmailSender implements EmailSender {

    private final SesClient sesClient;

    @Value("${cloud.aws.email.from}")
    private String fromEmail;

    @Override
    public void sendEmail(String to, String subject, String body) {
        try {
            SendEmailRequest request = SendEmailRequest.builder()
                    .source(fromEmail)
                    .destination(Destination.builder().toAddresses(to).build())
                    .message(Message.builder()
                            .subject(Content.builder().data(subject).build())
                            .body(Body.builder()
                                    .html(Content.builder().data(body).build())
                                    .build())
                            .build())
                    .build();

            sesClient.sendEmail(request);
            log.info("E-mail sent successfully to {} via AWS SES", to);
        } catch (Exception e) {
            log.error("E-mail not sent to {} via AWS SES: {}", to, e.getMessage(), e);
            throw new RuntimeException("Fail on email sending.", e);
        }
    }
}
