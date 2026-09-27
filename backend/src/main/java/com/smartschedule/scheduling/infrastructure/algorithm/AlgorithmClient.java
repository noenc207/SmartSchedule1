package com.smartschedule.scheduling.infrastructure.algorithm;

import com.smartschedule.common.error.DomainException;
import com.smartschedule.scheduling.infrastructure.algorithm.AlgorithmDtos.*;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class AlgorithmClient {
    private static final Logger log = LoggerFactory.getLogger(AlgorithmClient.class);
    private final RestClient restClient;
    private final AlgorithmProperties properties;

    public AlgorithmClient(AlgorithmProperties properties) {
        this.properties = properties;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) Duration.ofMillis(properties.getTimeoutMs()).toMillis());
        factory.setReadTimeout((int) Duration.ofMillis(properties.getTimeoutMs()).toMillis());

        this.restClient = RestClient.builder()
                .baseUrl(properties.getUrl())
                .requestFactory(factory)
                .build();
    }

    public OptimizeResponse optimize(OptimizeRequest request) {
        try {
            log.info("Sending optimization request to algorithm engine at {}/optimize for schedule {}",
                    properties.getUrl(), request.scheduleId());
            OptimizeResponse response = restClient.post()
                    .uri("/optimize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(OptimizeResponse.class);
            if (response == null) {
                throw new DomainException("ALGORITHM_ENGINE_EMPTY_RESPONSE", 502,
                        "Algorithm engine returned empty response.");
            }
            return response;
        } catch (DomainException de) {
            throw de;
        } catch (Exception ex) {
            log.error("Failed to call algorithm engine /optimize: {}", ex.getMessage());
            throw new DomainException("ALGORITHM_ENGINE_UNAVAILABLE", 503,
                    "Dịch vụ tối ưu hoá thuật toán nâng cao tạm thời không khả dụng. Vui lòng thử lại sau.");
        }
    }

    public WhatIfResponse whatIf(WhatIfRequest request) {
        try {
            log.info("Sending what-if request to algorithm engine at {}/what-if for schedule {}",
                    properties.getUrl(), request.scheduleId());
            WhatIfResponse response = restClient.post()
                    .uri("/what-if")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(WhatIfResponse.class);
            if (response == null) {
                throw new DomainException("ALGORITHM_ENGINE_EMPTY_RESPONSE", 502,
                        "Algorithm engine returned empty response.");
            }
            return response;
        } catch (DomainException de) {
            throw de;
        } catch (Exception ex) {
            log.error("Failed to call algorithm engine /what-if: {}", ex.getMessage());
            throw new DomainException("ALGORITHM_ENGINE_UNAVAILABLE", 503,
                    "Dịch vụ mô phỏng kịch bản What-If tạm thời không khả dụng. Vui lòng thử lại sau.");
        }
    }

    public AnalyzeMobilityResponse analyzeMobility(AnalyzeMobilityRequest request) {
        try {
            log.info("Sending mobility analysis request to algorithm engine at {}/analyze-mobility",
                    properties.getUrl());
            AnalyzeMobilityResponse response = restClient.post()
                    .uri("/analyze-mobility")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(AnalyzeMobilityResponse.class);
            if (response == null) {
                throw new DomainException("ALGORITHM_ENGINE_EMPTY_RESPONSE", 502,
                        "Algorithm engine returned empty response.");
            }
            return response;
        } catch (DomainException de) {
            throw de;
        } catch (Exception ex) {
            log.error("Failed to call algorithm engine /analyze-mobility: {}", ex.getMessage());
            throw new DomainException("ALGORITHM_ENGINE_UNAVAILABLE", 503,
                    "Dịch vụ phân tích di chuyển Campus tạm thời không khả dụng. Vui lòng thử lại sau.");
        }
    }
}
