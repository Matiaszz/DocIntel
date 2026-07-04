package com.docintel.security;

import com.docintel.shared.infrastructure.config.ObjectMapperConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

public class SecurityTest {

    private final ObjectMapper mapper = new ObjectMapperConfig().objectMapper();

    public record XssPayload(String text) {}

    @Test
    void shouldEscapeXssScriptTagsOnDeserialization() throws Exception {
        // Arrange
        String json = "{\"text\":\"<script>alert(1)</script>\"}";

        // Act
        XssPayload payload = mapper.readValue(json, XssPayload.class);

        // Assert
        assertEquals("&lt;script&gt;alert(1)&lt;/script&gt;", payload.text());
    }

    @Test
    void shouldEscapeHtmlAttributesOnDeserialization() throws Exception {
        // Arrange
        String json = "{\"text\":\"<img src=x onerror=\\\"alert(1)\\\">\"}";

        // Act
        XssPayload payload = mapper.readValue(json, XssPayload.class);

        // Assert
        assertEquals("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;", payload.text());
    }

    @Test
    void shouldEscapeJavaScriptProtocolsOnDeserialization() throws Exception {
        // Arrange
        String json = "{\"text\":\"javascript:alert(1)\"}";

        // Act
        XssPayload payload = mapper.readValue(json, XssPayload.class);

        // Assert
        assertEquals("javascript:alert(1)", payload.text());
    }
}
