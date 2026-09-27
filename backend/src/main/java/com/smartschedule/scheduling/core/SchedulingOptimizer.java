package com.smartschedule.scheduling.core;

import java.time.*;
import java.util.*;

/** Pure, deterministic scheduling core. Persistence and authorization stay outside this package. */
public final class SchedulingOptimizer {
    public record TaskSpec(UUID id, String title, int remainingMinutes, String priority, Instant deadline,
                            LocalTime preferredStart, LocalTime preferredEnd, int minimumSessionMinutes,
                            int maximumSessionMinutes, UUID categoryId, boolean splittable) {
        public TaskSpec(UUID id, String title, int remainingMinutes, String priority, Instant deadline,
                        LocalTime preferredStart, LocalTime preferredEnd, int minimumSessionMinutes,
                        int maximumSessionMinutes, UUID categoryId) {
            this(id, title, remainingMinutes, priority, deadline, preferredStart, preferredEnd,
                    minimumSessionMinutes, maximumSessionMinutes, categoryId, true);
        }
    }
    public record AvailabilityWindow(DayOfWeek day, LocalDate date, LocalTime start, LocalTime end) {}
    public record BusyInterval(Instant start, Instant end) {}
    public record PlannedSlot(UUID taskId, String title, UUID categoryId, Instant start, Instant end, int score) {}

    public List<PlannedSlot> optimize(Instant from, Instant to, ZoneId zone, List<TaskSpec> tasks,
                                       List<AvailabilityWindow> availability, List<BusyInterval> busy) {
        return optimize(from, to, zone, tasks, availability, busy, 15);
    }
    public List<PlannedSlot> optimize(Instant from, Instant to, ZoneId zone, List<TaskSpec> tasks,
                                       List<AvailabilityWindow> availability, List<BusyInterval> busy, int granularityMinutes) {
        if (granularityMinutes < 1 || granularityMinutes > 1440) throw new IllegalArgumentException("Invalid granularity");
        List<PlannedSlot> result = new ArrayList<>();
        List<BusyInterval> occupied = new ArrayList<>(busy);
        List<TaskSpec> ordered = tasks.stream().filter(t -> t.remainingMinutes() > 0)
                .sorted(Comparator.comparingInt(this::priorityWeight).reversed()
                        .thenComparing(t -> t.deadline() == null ? Instant.MAX : t.deadline())
                        .thenComparing(t -> t.id().toString())).toList();
        for (TaskSpec task : ordered) {
            int left = task.remainingMinutes();
            while (left >= task.minimumSessionMinutes()) {
                PlannedSlot best = candidates(task, left, from, to, zone, availability, occupied, granularityMinutes).stream()
                        .max(Comparator.comparingInt(PlannedSlot::score)
                                .thenComparing(PlannedSlot::start, Comparator.reverseOrder())).orElse(null);
                if (best == null) break;
                result.add(best);
                occupied.add(new BusyInterval(best.start(), best.end()));
                left -= (int) Duration.between(best.start(), best.end()).toMinutes();
            }
        }
        // Bounded improvement: move each selected slot to the best free candidate once.
        for (int i = 0; i < result.size(); i++) {
            PlannedSlot current = result.get(i);
            List<BusyInterval> without = new ArrayList<>(busy);
            for (int j = 0; j < result.size(); j++) if (j != i) without.add(new BusyInterval(result.get(j).start(), result.get(j).end()));
            TaskSpec task = tasks.stream().filter(t -> t.id().equals(current.taskId())).findFirst().orElse(null);
            if (task == null) continue;
            PlannedSlot improved = candidates(task, (int) Duration.between(current.start(), current.end()).toMinutes(),
                    from, to, zone, availability, without, granularityMinutes).stream()
                    .max(Comparator.comparingInt(PlannedSlot::score).thenComparing(PlannedSlot::start, Comparator.reverseOrder()))
                    .orElse(current);
            if (improved.score() > current.score()) result.set(i, improved);
        }
        result.sort(Comparator.comparing(PlannedSlot::start).thenComparing(PlannedSlot::taskId));
        return List.copyOf(result);
    }

    private List<PlannedSlot> candidates(TaskSpec task, int left, Instant from, Instant to, ZoneId zone,
                                         List<AvailabilityWindow> windows, List<BusyInterval> busy, int granularityMinutes) {
        List<PlannedSlot> out = new ArrayList<>();
        if (!task.splittable() && left > task.maximumSessionMinutes()) return out;
        int duration = Math.min(Math.min(left, task.maximumSessionMinutes()), Math.max(task.minimumSessionMinutes(), left));
        for (AvailabilityWindow window : windows) {
            LocalDate date = window.date();
            for (LocalTime start = window.start(); !start.plusMinutes(duration).isAfter(window.end()); start = start.plusMinutes(granularityMinutes)) {
                Instant s = ZonedDateTime.of(date, start, zone).toInstant();
                Instant e = s.plusSeconds(duration * 60L);
                if (s.isBefore(from) || e.isAfter(to) || overlaps(s, e, busy)) continue;
                out.add(new PlannedSlot(task.id(), task.title(), task.categoryId(), s, e, score(task, s, zone)));
            }
        }
        return out;
    }

    private boolean overlaps(Instant start, Instant end, List<BusyInterval> busy) {
        return busy.stream().anyMatch(b -> start.isBefore(b.end()) && end.isAfter(b.start()));
    }
    private int score(TaskSpec task, Instant start, ZoneId zone) {
        int score = priorityWeight(task) * 100;
        if (task.deadline() != null) {
            long days = Duration.between(start, task.deadline()).toDays();
            score += (int) Math.max(-100, Math.min(100, 100 - days));
        }
        LocalTime time = start.atZone(zone).toLocalTime();
        if (task.preferredStart() != null && task.preferredEnd() != null
                && !time.isBefore(task.preferredStart()) && !time.isAfter(task.preferredEnd())) score += 50;
        score -= time.getHour();
        return score;
    }
    private int priorityWeight(TaskSpec task) {
        return switch (task.priority() == null ? "MEDIUM" : task.priority().toUpperCase(Locale.ROOT)) {
            case "URGENT" -> 4; case "HIGH" -> 3; case "LOW" -> 1; default -> 2;
        };
    }
}
