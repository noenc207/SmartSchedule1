package com.smartschedule.ai.application;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages active pending intents across conversation turns.
 * Preserves multi-turn state so user clarifications, corrections,
 * and field fillings can complete actions without restarting.
 */
@Service
public class AiPendingIntentService {

    public record PendingIntent(
            UUID conversationId,
            String intent,
            Map<String, Object> knownFields,
            List<String> missingFields,
            String targetObjectId,
            List<String> clarificationOptions,
            String clarificationQuestion,
            Instant createdAt,
            Instant expiresAt
    ) {
        public boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    public record MergeResult(
            boolean matchedPending,
            boolean isCancelled,
            boolean isCorrection,
            PendingIntent updatedIntent,
            boolean isFullyResolved
    ) {}

    private final Map<UUID, PendingIntent> pendingStore = new ConcurrentHashMap<>();
    private static final Duration TTL = Duration.ofMinutes(15);
    private final AiAliasService aliasService;

    public AiPendingIntentService() {
        this(new AiAliasService());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AiPendingIntentService(AiAliasService aliasService) {
        this.aliasService = aliasService != null ? aliasService : new AiAliasService();
    }

    public void save(UUID conversationId, PendingIntent intent) {
        if (conversationId != null && intent != null) {
            pendingStore.put(conversationId, intent);
        }
    }

    public Optional<PendingIntent> get(UUID conversationId) {
        if (conversationId == null) return Optional.empty();
        PendingIntent pi = pendingStore.get(conversationId);
        if (pi == null) return Optional.empty();
        if (pi.isExpired()) {
            pendingStore.remove(conversationId);
            return Optional.empty();
        }
        return Optional.of(pi);
    }

    public void clear(UUID conversationId) {
        if (conversationId != null) {
            pendingStore.remove(conversationId);
        }
    }

    /**
     * Attempts to merge a user's follow-up message into an active pending intent.
     */
    public MergeResult processFollowUp(UUID conversationId, String userMessage) {
        Optional<PendingIntent> opt = get(conversationId);
        if (opt.isEmpty()) {
            return new MergeResult(false, false, false, null, false);
        }

        PendingIntent current = opt.get();
        String msg = userMessage.trim().toLowerCase();

        // 1. Cancellation keywords
        if (msg.equals("thôi bỏ") || msg.equals("thôi") || msg.equals("hủy") || msg.equals("huy")
                || msg.equals("thôi không cần") || msg.equals("bỏ đi") || msg.equals("cancel")
                || msg.contains("thôi không cần nữa") || msg.contains("đừng làm nữa")) {
            clear(conversationId);
            return new MergeResult(true, true, false, null, false);
        }

        Map<String, Object> updatedFields = new LinkedHashMap<>(current.knownFields());
        List<String> remainingMissing = new ArrayList<>(current.missingFields());
        boolean wasCorrection = false;

        // 2. User Correction patterns: "Không phải Physics, là Math", "Không, 2 tiếng"
        if (msg.contains("không phải") || msg.contains("khong phai") || msg.startsWith("không, ") || msg.startsWith("khong, ")) {
            wasCorrection = true;
            // Subject correction
            if (msg.contains("là ") || msg.contains("la ")) {
                String after = msg.substring(msg.indexOf("là ") != -1 ? msg.indexOf("là ") + 3 : msg.indexOf("la ") + 3).trim();
                if (!after.isBlank()) {
                    String canonical = aliasService.resolveSubject(after).orElse(after);
                    updatedFields.put("title", canonical);
                    if (updatedFields.containsKey("target_title")) {
                        updatedFields.put("target_title", canonical);
                    }
                }
            }
        }

        // 3. Duration extraction (e.g. "90 phút", "1 tiếng rưỡi", "2 tiếng", "45p")
        Integer parsedDuration = AiDateTimeUtils.parseDurationMinutes(msg);
        if (parsedDuration != null) {
            updatedFields.put("duration_minutes", parsedDuration);
            remainingMissing.remove("duration");
            remainingMissing.remove("duration_minutes");
        }

        // 4. Time extraction (e.g. "8h", "8h30", "14:00", "lúc 8 giờ")
        LocalTime parsedTime = AiDateTimeUtils.parseLocalTime(msg);
        if (parsedTime != null) {
            updatedFields.put("start_time", parsedTime.toString());
            remainingMissing.remove("start_time");
        }

        // 5. Option index selection (e.g. "1", "2", "A", "B")
        if (current.clarificationOptions() != null && !current.clarificationOptions().isEmpty()) {
            if (msg.equals("1") || msg.equalsIgnoreCase("a")) {
                updatedFields.put("selected_choice", current.clarificationOptions().get(0));
                remainingMissing.clear();
            } else if (current.clarificationOptions().size() >= 2 && (msg.equals("2") || msg.equalsIgnoreCase("b"))) {
                updatedFields.put("selected_choice", current.clarificationOptions().get(1));
                remainingMissing.clear();
            } else if (current.clarificationOptions().size() >= 3 && (msg.equals("3") || msg.equalsIgnoreCase("c"))) {
                updatedFields.put("selected_choice", current.clarificationOptions().get(2));
                remainingMissing.clear();
            }
        }

        boolean isFullyResolved = remainingMissing.isEmpty();

        PendingIntent updated = new PendingIntent(
                current.conversationId(),
                current.intent(),
                updatedFields,
                remainingMissing,
                current.targetObjectId(),
                current.clarificationOptions(),
                current.clarificationQuestion(),
                current.createdAt(),
                Instant.now().plus(TTL)
        );

        if (isFullyResolved) {
            clear(conversationId);
        } else {
            save(conversationId, updated);
        }

        return new MergeResult(true, false, wasCorrection, updated, isFullyResolved);
    }
}
