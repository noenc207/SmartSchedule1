package com.smartschedule.ai.application;

import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Normalizes user queries, repairs typos, expands abbreviations,
 * and decodes Vietnamese colloquial/slang expressions.
 */
@Service
public class AiQueryRepairService {

    public record RepairResult(
            String originalQuery,
            String repairedQuery,
            String normalizedUnaccented,
            boolean wasRepaired,
            List<String> detectedSlangOrShortcuts
    ) {}

    private static final Map<Pattern, String> TYPO_AND_SHORTCUT_RULES = new LinkedHashMap<>();
    private static final Map<Pattern, String> SLANG_TO_CANONICAL_ACTIONS = new LinkedHashMap<>();

    static {
        // 1. Google Ecosystem Shortcuts
        addTypoRule("(?i)\\b(gg\\s*cal|gcal|google\\s*cal|g-cal)\\b", "Google Calendar");
        addTypoRule("(?i)\\b(gg\\s*sheet|gg\\s*sheets|g-sheet|gsheet)\\b", "Google Sheets");

        // 2. Schedule Typos & Unaccented standard expansions
        addTypoRule("(?i)\\blich\\s+ly\\b", "lịch Lý");
        addTypoRule("(?i)\\blich\\s+toan\\b", "lịch Toán");
        addTypoRule("(?i)\\blich\\s+hoa\\b", "lịch Hóa");
        addTypoRule("(?i)\\blich\\s+anh\\b", "lịch Tiếng Anh");
        addTypoRule("(?i)\\blich\\s+su\\b", "lịch Lịch Sử");
        addTypoRule("(?i)\\blich\\s+dia\\b", "lịch Địa Lý");
        addTypoRule("(?i)\\blich\\s+sinh\\b", "lịch Sinh Học");
        addTypoRule("(?i)\\blich\\s+tin\\b", "lịch Tin Học");

        // 3. Days of week abbreviations
        addTypoRule("(?i)\\b(chu\\s*nhat|chunhat|cn)\\b", "Chủ nhật");
        addTypoRule("(?i)\\b(t2|thu\\s*2)\\b", "thứ 2");
        addTypoRule("(?i)\\b(t3|thu\\s*3)\\b", "thứ 3");
        addTypoRule("(?i)\\b(t4|thu\\s*4)\\b", "thứ 4");
        addTypoRule("(?i)\\b(t5|thu\\s*5)\\b", "thứ 5");
        addTypoRule("(?i)\\b(t6|thu\\s*6)\\b", "thứ 6");
        addTypoRule("(?i)\\b(t7|thu\\s*7)\\b", "thứ 7");

        // 4. Time unit abbreviations
        addTypoRule("(?i)\\b(\\d+)\\s*(tieng\\s*ruoi|tiếng\\s*rưỡi)\\b", "$1 giờ 30 phút");
        addTypoRule("(?i)\\b(1\\s*tieng\\s*ruoi|1\\s*tiếng\\s*rưỡi|1h30|1h30p)\\b", "90 phút");
        addTypoRule("(?i)\\b(\\d+)\\s*p\\b", "$1 phút");
        addTypoRule("(?i)\\b(\\d+)\\s*g\\b", "$1 giờ");

        // 5. Common Slang / Colloquial Mutation Patterns
        // "cho [môn] out" / "cho [môn] bay màu" -> "xóa lịch [môn]"
        addSlangRule("(?i)\\bcho\\s+lịch\\s+([a-zA-Z0-9_À-ỹ]+)\\s+(out|bay màu|cút|nghỉ)\\b", "xóa lịch $1");
        addSlangRule("(?i)\\bcho\\s+([a-zA-Z0-9_À-ỹ]+)\\s+(out|bay màu|cút|nghỉ)\\b", "xóa lịch $1");
        addSlangRule("(?i)\\b(bỏ|hủy|huy|bo)\\s+lịch\\s+([a-zA-Z0-9_À-ỹ]+)\\b", "xóa lịch $2");
        addSlangRule("(?i)\\blịch\\s+([a-zA-Z0-9_À-ỹ]+)\\s+bỏ\\s+đi\\b", "xóa lịch $1");
        addSlangRule("(?i)\\bcho\\s+([a-zA-Z0-9_À-ỹ]+)\\s+vào\\s+chỗ\\s+(đó|này)\\b", "thay bằng $1");
        addSlangRule("(?i)\\bđưa\\s+hết\\s+vào\\s+lịch\\b", "nhập toàn bộ vào lịch");
        addSlangRule("(?i)\\bđưa\\s+vào\\s+lịch\\s+giúp\\s+tôi\\b", "đồng bộ vào lịch");
        addSlangRule("(?i)\\bbắt\\s+đầu\\s+đồng\\s+bộ\\s+vào\\s+lịch\\b", "đồng bộ vào lịch");
    }

    private static void addTypoRule(String regex, String replacement) {
        TYPO_AND_SHORTCUT_RULES.put(Pattern.compile(regex), replacement);
    }

    private static void addSlangRule(String regex, String replacement) {
        SLANG_TO_CANONICAL_ACTIONS.put(Pattern.compile(regex), replacement);
    }

    /**
     * Repairs and normalizes raw user input into canonical Vietnamese representation.
     */
    public RepairResult repair(String rawInput) {
        if (rawInput == null || rawInput.isBlank()) {
            return new RepairResult("", "", "", false, List.of());
        }

        String cleaned = rawInput.trim().replaceAll("\\s+", " ");
        String working = cleaned;
        List<String> detected = new ArrayList<>();

        // Pass 1: Slang & Colloquial transformation
        for (Map.Entry<Pattern, String> entry : SLANG_TO_CANONICAL_ACTIONS.entrySet()) {
            Matcher m = entry.getKey().matcher(working);
            if (m.find()) {
                detected.add("SLANG: " + m.group(0));
                working = m.replaceAll(entry.getValue());
            }
        }

        // Pass 2: Typo & Shortcut repair
        for (Map.Entry<Pattern, String> entry : TYPO_AND_SHORTCUT_RULES.entrySet()) {
            Matcher m = entry.getKey().matcher(working);
            if (m.find()) {
                detected.add("SHORTCUT: " + m.group(0));
                working = m.replaceAll(entry.getValue());
            }
        }

        boolean wasRepaired = !working.equalsIgnoreCase(cleaned);
        String unaccented = stripAccents(working).toLowerCase();

        return new RepairResult(cleaned, working, unaccented, wasRepaired, detected);
    }

    /**
     * Strips Vietnamese accents for reliable accent-insensitive semantic matching.
     */
    public String stripAccents(String text) {
        if (text == null) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD);
        String withoutAccents = normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return withoutAccents.replace('đ', 'd').replace('Đ', 'D');
    }

    /**
     * Checks if a phrase is semantically equal to a target disregarding case, accents, and spacing.
     */
    public boolean matchesFuzzy(String source, String target) {
        if (source == null || target == null) return false;
        String s1 = stripAccents(source).trim().toLowerCase().replaceAll("\\s+", " ");
        String s2 = stripAccents(target).trim().toLowerCase().replaceAll("\\s+", " ");
        return s1.contains(s2) || s2.contains(s1);
    }
}
