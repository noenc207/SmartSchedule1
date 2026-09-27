package com.smartschedule.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.smartschedule.auth.application.TokenHasher;
import org.junit.jupiter.api.Test;

class TokenHasherTest {
    private final TokenHasher hasher = new TokenHasher();

    @Test
    void hashesDeterministicallyWithoutReturningRawToken() {
        String raw = "refresh-token-value";

        assertThat(hasher.hash(raw)).hasSize(64).doesNotContain(raw);
        assertThat(hasher.hash(raw)).isEqualTo(hasher.hash(raw));
    }
}
