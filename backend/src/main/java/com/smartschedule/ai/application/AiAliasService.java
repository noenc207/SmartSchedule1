package com.smartschedule.ai.application;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalTime;
import java.util.*;

/**
 * Manages configurable aliases for academic subjects, external providers,
 * and canonical time session representations.
 */
@Service
public class AiAliasService {

    private final Map<String, String> subjectAliases = new HashMap<>();
    private final Map<String, String> providerAliases = new HashMap<>();
    private final Map<String, LocalTime> sessionAliases = new HashMap<>();

    public AiAliasService() {
        initDefaultAliases();
    }

    private void initDefaultAliases() {
        // 1. Academic Subjects
        registerSubjectAlias("Vật lý", List.of("vật lý", "vat ly", "lý", "ly", "physics", "phys"));
        registerSubjectAlias("Toán", List.of("toán", "toan", "mathematics", "math", "toán cao cấp", "toan cao cap", "giải tích", "giai tich", "đại số", "dai so"));
        registerSubjectAlias("Hóa học", List.of("hóa học", "hoa hoc", "hóa", "hoa", "chemistry", "chem"));
        registerSubjectAlias("Tiếng Anh", List.of("tiếng anh", "tieng anh", "anh", "english", "av", "anh văn", "anh van"));
        registerSubjectAlias("Lập trình", List.of("lập trình", "lap trinh", "code", "coding", "programming", "pro", "prf", "csci", "java", "python"));
        registerSubjectAlias("Vovinam", List.of("vovinam", "vov", "võ", "vo"));
        registerSubjectAlias("Triết học Mác-Lênin", List.of("triết học mác-lênin", "triet hoc mac-lenin", "triết", "triet", "mln", "marx"));
        registerSubjectAlias("Ngữ văn", List.of("ngữ văn", "ngu van", "văn", "van", "literature"));
        registerSubjectAlias("Lịch sử", List.of("lịch sử", "lich su", "sử", "su", "history"));
        registerSubjectAlias("Địa lý", List.of("địa lý", "dia ly", "địa", "dia", "geography"));
        registerSubjectAlias("Sinh học", List.of("sinh học", "sinh hoc", "sinh", "biology", "bio"));

        // 2. Providers & Resources
        registerProviderAlias("GOOGLE_CALENDAR", List.of("google calendar", "google cal", "gcal", "gg cal", "g-cal", "lịch google", "lich google"));
        registerProviderAlias("GOOGLE_SHEETS", List.of("google sheets", "google sheet", "gg sheets", "gg sheet", "g-sheet", "bảng tính google", "bang tinh google", "sheet"));

        // 3. Time Sessions
        sessionAliases.put("sang", LocalTime.of(8, 0));
        sessionAliases.put("sáng", LocalTime.of(8, 0));
        sessionAliases.put("chieu", LocalTime.of(14, 0));
        sessionAliases.put("chiều", LocalTime.of(14, 0));
        sessionAliases.put("toi", LocalTime.of(19, 0));
        sessionAliases.put("tối", LocalTime.of(19, 0));
        sessionAliases.put("trua", LocalTime.of(11, 30));
        sessionAliases.put("trưa", LocalTime.of(11, 30));
        sessionAliases.put("dem", LocalTime.of(21, 0));
        sessionAliases.put("đêm", LocalTime.of(21, 0));
    }

    public synchronized void registerSubjectAlias(String canonicalName, List<String> aliases) {
        for (String alias : aliases) {
            subjectAliases.put(normalizeKey(alias), canonicalName);
        }
    }

    public synchronized void registerProviderAlias(String canonicalKey, List<String> aliases) {
        for (String alias : aliases) {
            providerAliases.put(normalizeKey(alias), canonicalKey);
        }
    }

    private static final Set<String> STOP_WORDS = Set.of(
            "lịch", "lich", "môn", "mon", "tiết", "tiet", "buổi", "buoi", "lớp", "lop",
            "ngày", "ngay", "giờ", "gio", "của", "cua", "cho", "đi", "di", "ra", "vào", "vao",
            "rồi", "roi", "cái", "cai", "nó", "no", "tối", "toi", "sáng", "sang", "chiều", "chieu"
    );

    public Optional<String> resolveSubject(String input) {
        if (input == null || input.isBlank()) return Optional.empty();
        String key = normalizeKey(input);
        if (STOP_WORDS.contains(key)) return Optional.empty();

        if (subjectAliases.containsKey(key)) {
            return Optional.of(subjectAliases.get(key));
        }

        // Exact whole-word matching
        for (Map.Entry<String, String> entry : subjectAliases.entrySet()) {
            String aliasKey = entry.getKey();
            if (aliasKey.length() >= 2 && (key.equals(aliasKey)
                    || key.startsWith(aliasKey + " ")
                    || key.endsWith(" " + aliasKey)
                    || key.contains(" " + aliasKey + " "))) {
                return Optional.of(entry.getValue());
            }
        }
        return Optional.empty();
    }

    public Optional<String> resolveProvider(String input) {
        if (input == null || input.isBlank()) return Optional.empty();
        String key = normalizeKey(input);
        if (providerAliases.containsKey(key)) {
            return Optional.of(providerAliases.get(key));
        }
        for (Map.Entry<String, String> entry : providerAliases.entrySet()) {
            if (key.contains(entry.getKey())) {
                return Optional.of(entry.getValue());
            }
        }
        return Optional.empty();
    }

    public Optional<LocalTime> resolveSessionTime(String input) {
        if (input == null || input.isBlank()) return Optional.empty();
        String key = normalizeKey(input);
        return Optional.ofNullable(sessionAliases.get(key));
    }

    private String normalizeKey(String text) {
        String normalized = Normalizer.normalize(text.trim().toLowerCase(), Normalizer.Form.NFD);
        String withoutAccents = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return withoutAccents.replace('đ', 'd').replace('Đ', 'D').replaceAll("\\s+", " ");
    }
}
