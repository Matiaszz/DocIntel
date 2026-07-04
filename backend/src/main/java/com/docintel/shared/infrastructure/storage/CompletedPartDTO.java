package com.docintel.shared.infrastructure.storage;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

public record CompletedPartDTO(int partNumber, String eTag) {
}
