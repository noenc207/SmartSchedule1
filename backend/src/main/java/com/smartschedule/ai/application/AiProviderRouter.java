package com.smartschedule.ai.application;

import com.smartschedule.ai.config.AiProperties;
import com.smartschedule.ai.domain.AiConversation;
import com.smartschedule.ai.infrastructure.AiConversationRepository;
import com.smartschedule.user.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * AI Provider Router with WayJet Primary, deterministic fallback chain,
 * conversation pinning, circuit breaking, and telemetry recording.
 */
@Primary
@Component
public class AiProviderRouter implements AiProvider {

    private static final Logger log = LoggerFactory.getLogger(AiProviderRouter.class);

    private final Map<String, AiProvider> providerMap = new ConcurrentHashMap<>();
    private final AiProperties properties;
    private final AiCircuitBreaker circuitBreaker;
    private final AiConversationRepository conversationRepository;
    private final AiUsageService usageService;

    @Autowired
    public AiProviderRouter(
            List<AiProvider> allProviders,
            AiProperties properties,
            AiCircuitBreaker circuitBreaker,
            AiConversationRepository conversationRepository,
            @Autowired(required = false) AiUsageService usageService
    ) {
        this.properties = properties;
        this.circuitBreaker = circuitBreaker != null ? circuitBreaker : new AiCircuitBreaker(properties);
        this.conversationRepository = conversationRepository;
        this.usageService = usageService;

        if (allProviders != null) {
            for (AiProvider p : allProviders) {
                if (p != this && !(p instanceof AiProviderRouter)) {
                    providerMap.put(p.getName().toLowerCase().trim(), p);
                }
            }
        }
    }

    public AiProviderRouter(
            Map<String, AiProvider> providers,
            AiProperties properties,
            AiCircuitBreaker circuitBreaker,
            AiConversationRepository conversationRepository,
            AiUsageService usageService
    ) {
        this.properties = properties;
        this.circuitBreaker = circuitBreaker;
        this.conversationRepository = conversationRepository;
        this.usageService = usageService;
        if (providers != null) {
            providers.forEach((k, v) -> providerMap.put(k.toLowerCase().trim(), v));
        }
    }

    @Override
    public String getName() {
        return "router";
    }

    @Override
    public String getModel() {
        AiProvider primary = getPrimaryProvider();
        return primary != null ? primary.getModel() : "default";
    }

    @Override
    public boolean supportsTools() {
        return true;
    }

    @Override
    public boolean supportsStructuredOutput() {
        return true;
    }

    @Override
    public ProviderHealth healthCheck() {
        AiProvider primary = getPrimaryProvider();
        if (primary != null) {
            return primary.healthCheck();
        }
        return new ProviderHealth(HealthStatus.UNAVAILABLE, "No AI primary provider available", 0);
    }

    public AiProvider getPrimaryProvider() {
        String name = properties.primaryProvider();
        return providerMap.get(name != null ? name.toLowerCase().trim() : "wayjet");
    }

    public AiProvider getProvider(String name) {
        return name != null ? providerMap.get(name.toLowerCase().trim()) : null;
    }

    public Map<String, AiProvider> getRegisteredProviders() {
        return Collections.unmodifiableMap(providerMap);
    }

    public List<AiProvider> resolveProviderCandidates(AiConversation conversation) {
        List<AiProvider> candidates = new ArrayList<>();
        Set<String> added = new HashSet<>();

        // 1. Conversation pinned provider (if set, available, and circuit is not open)
        if (conversation != null && conversation.getPinnedProvider() != null) {
            String pinned = conversation.getPinnedProvider().toLowerCase().trim();
            AiProvider prov = providerMap.get(pinned);
            if (prov != null && prov.hasApiKey() && circuitBreaker.canExecute(pinned)) {
                candidates.add(prov);
                added.add(pinned);
            }
        }

        // 2. Primary provider (default: wayjet)
        String primaryName = properties.primaryProvider().toLowerCase().trim();
        if (!added.contains(primaryName)) {
            AiProvider primary = providerMap.get(primaryName);
            if (primary != null && primary.hasApiKey() && circuitBreaker.canExecute(primaryName)) {
                candidates.add(primary);
                added.add(primaryName);
            }
        }

        // 3. Fallback chain in configured deterministic order
        String fallbackOrder = properties.fallbackOrder();
        if (fallbackOrder != null && !fallbackOrder.isBlank()) {
            for (String item : fallbackOrder.split("[,;\\s]+")) {
                String name = item.toLowerCase().trim();
                if (!name.isEmpty() && !added.contains(name)) {
                    AiProvider fb = providerMap.get(name);
                    if (fb != null && fb.hasApiKey() && circuitBreaker.canExecute(name)) {
                        candidates.add(fb);
                        added.add(name);
                    }
                }
            }
        }

        // 4. Last resort: if circuit breaker blocked all candidates, try any available provider with API key
        if (candidates.isEmpty()) {
            AiProvider primary = providerMap.get(primaryName);
            if (primary != null && primary.hasApiKey()) {
                candidates.add(primary);
            }
            for (AiProvider p : providerMap.values()) {
                if (p.hasApiKey() && !candidates.contains(p)) {
                    candidates.add(p);
                }
            }
        }

        return candidates;
    }

    @Override
    public ProviderResponse generateResponse(String systemInstruction, List<ChatMessage> history, String userMessage) {
        return generateResponse(null, null, systemInstruction, history, userMessage);
    }

    public ProviderResponse generateResponse(
            AiConversation conversation,
            User user,
            String systemInstruction,
            List<ChatMessage> history,
            String userMessage
    ) {
        List<AiProvider> candidates = resolveProviderCandidates(conversation);
        if (candidates.isEmpty()) {
            throw new AiException("AI_SERVICE_UNAVAILABLE", "Hệ thống AI hiện chưa được cấu hình nhà cung cấp hợp lệ.");
        }

        Throwable lastError = null;

        for (int i = 0; i < candidates.size(); i++) {
            AiProvider provider = candidates.get(i);
            long start = System.currentTimeMillis();
            try {
                log.info("Routing AI prompt to provider '{}' (model: {}) [attempt {}/{}]",
                        provider.getName(), provider.getModel(), i + 1, candidates.size());

                ProviderResponse response = provider.generateResponse(systemInstruction, history, userMessage);
                long latency = System.currentTimeMillis() - start;

                circuitBreaker.recordSuccess(provider.getName());
                updatePinnedProvider(conversation, provider);

                if (usageService != null) {
                    usageService.recordTelemetry(
                            user,
                            conversation,
                            UUID.randomUUID().toString(),
                            null,
                            provider.getName(),
                            provider.getModel(),
                            latency,
                            response.tokensUsed(),
                            i == 0 ? "SUCCESS" : "FALLBACK",
                            i == 0 ? null : "Failover from earlier provider"
                    );
                }

                return response;

            } catch (Throwable ex) {
                long latency = System.currentTimeMillis() - start;
                lastError = ex;
                circuitBreaker.recordFailure(provider.getName(), ex);

                log.warn("AI Provider '{}' failed (attempt {}/{}): {}",
                        provider.getName(), i + 1, candidates.size(), ex.getMessage());

                if (usageService != null) {
                    usageService.recordTelemetry(
                            user,
                            conversation,
                            UUID.randomUUID().toString(),
                            null,
                            provider.getName(),
                            provider.getModel(),
                            latency,
                            null,
                            "FAILED",
                            ex.getMessage()
                    );
                }
            }
        }

        log.error("All AI providers in fallback chain failed! (total: {})", candidates.size(), lastError);
        throw new AiException("AI_SERVICE_UNAVAILABLE",
                "Hệ thống SmartSchedule AI hiện đang bận hoặc gặp sự cố kết nối. Vui lòng thử lại sau ít phút.");
    }

    @Override
    public void streamResponse(
            String systemInstruction,
            List<ChatMessage> history,
            String userMessage,
            Consumer<String> onChunk,
            Consumer<List<ToolCall>> onCompleteWithTools,
            Consumer<Throwable> onError
    ) {
        streamResponse(null, null, systemInstruction, history, userMessage, onChunk, onCompleteWithTools, onError);
    }

    public void streamResponse(
            AiConversation conversation,
            User user,
            String systemInstruction,
            List<ChatMessage> history,
            String userMessage,
            Consumer<String> onChunk,
            Consumer<List<ToolCall>> onCompleteWithTools,
            Consumer<Throwable> onError
    ) {
        List<AiProvider> candidates = resolveProviderCandidates(conversation);
        if (candidates.isEmpty()) {
            onError.accept(new AiException("AI_SERVICE_UNAVAILABLE", "Hệ thống AI hiện chưa được cấu hình nhà cung cấp hợp lệ."));
            return;
        }

        tryStreamCandidate(candidates, 0, conversation, user, systemInstruction, history, userMessage,
                onChunk, onCompleteWithTools, onError);
    }

    private void tryStreamCandidate(
            List<AiProvider> candidates,
            int index,
            AiConversation conversation,
            User user,
            String systemInstruction,
            List<ChatMessage> history,
            String userMessage,
            Consumer<String> onChunk,
            Consumer<List<ToolCall>> onCompleteWithTools,
            Consumer<Throwable> onError
    ) {
        if (index >= candidates.size()) {
            onError.accept(new AiException("AI_SERVICE_UNAVAILABLE",
                    "Hệ thống SmartSchedule AI hiện đang bận hoặc gặp sự cố kết nối. Vui lòng thử lại sau ít phút."));
            return;
        }

        AiProvider provider = candidates.get(index);
        long start = System.currentTimeMillis();
        AtomicInteger chunksEmitted = new AtomicInteger(0);

        log.info("Streaming AI response via provider '{}' (model: {}) [attempt {}/{}]",
                provider.getName(), provider.getModel(), index + 1, candidates.size());

        provider.streamResponse(
                systemInstruction,
                history,
                userMessage,
                chunk -> {
                    chunksEmitted.incrementAndGet();
                    onChunk.accept(chunk);
                },
                tools -> {
                    long latency = System.currentTimeMillis() - start;
                    circuitBreaker.recordSuccess(provider.getName());
                    updatePinnedProvider(conversation, provider);

                    if (usageService != null) {
                        usageService.recordTelemetry(
                                user,
                                conversation,
                                UUID.randomUUID().toString(),
                                null,
                                provider.getName(),
                                provider.getModel(),
                                latency,
                                null,
                                index == 0 ? "SUCCESS" : "FALLBACK",
                                index == 0 ? null : "Failover from earlier provider"
                        );
                    }

                    onCompleteWithTools.accept(tools);
                },
                error -> {
                    long latency = System.currentTimeMillis() - start;
                    circuitBreaker.recordFailure(provider.getName(), error);

                    if (usageService != null) {
                        usageService.recordTelemetry(
                                user,
                                conversation,
                                UUID.randomUUID().toString(),
                                null,
                                provider.getName(),
                                provider.getModel(),
                                latency,
                                null,
                                "FAILED",
                                error.getMessage()
                        );
                    }

                    log.warn("AI stream failed for provider '{}' (chunks emitted: {}): {}",
                            provider.getName(), chunksEmitted.get(), error.getMessage());

                    // If zero chunks were streamed to user, we can seamlessly failover to next candidate
                    if (chunksEmitted.get() == 0 && index + 1 < candidates.size()) {
                        log.info("Failing over stream to next provider candidate: '{}'", candidates.get(index + 1).getName());
                        tryStreamCandidate(candidates, index + 1, conversation, user, systemInstruction, history, userMessage,
                                onChunk, onCompleteWithTools, onError);
                    } else {
                        onError.accept(new AiException("AI_SERVICE_UNAVAILABLE",
                                "Hệ thống SmartSchedule AI hiện đang bận hoặc gặp sự cố kết nối. Vui lòng thử lại sau ít phút."));
                    }
                }
        );
    }

    private void updatePinnedProvider(AiConversation conversation, AiProvider provider) {
        if (conversation != null && conversationRepository != null) {
            String currentPinned = conversation.getPinnedProvider();
            String currentModel = conversation.getPinnedModel();
            boolean providerChanged = currentPinned == null || !currentPinned.equalsIgnoreCase(provider.getName());
            boolean modelChanged = currentModel == null || !currentModel.equalsIgnoreCase(provider.getModel());

            if (providerChanged || modelChanged) {
                conversation.setPinnedProvider(provider.getName());
                conversation.setPinnedModel(provider.getModel());
                try {
                    conversationRepository.save(conversation);
                    log.info("Conversation {} pinned to provider '{}' (model: {})",
                            conversation.getId(), provider.getName(), provider.getModel());
                } catch (Exception ex) {
                    log.warn("Failed to persist pinned provider for conversation {}: {}", conversation.getId(), ex.getMessage());
                }
            }
        }
    }
}
