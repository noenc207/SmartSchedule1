package com.smartschedule.ai.domain;

import com.smartschedule.user.domain.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_conversations")
public class AiConversation {
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 255)
    private String title = "Cuộc trò chuyện mới";

    @Column(name = "pinned_provider", length = 64)
    private String pinnedProvider = "wayjet";

    @Column(name = "pinned_model", length = 128)
    private String pinnedModel;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected AiConversation() {
    }

    public AiConversation(User user, String title) {
        this.id = UUID.randomUUID();
        this.user = user;
        this.title = (title != null && !title.isBlank()) ? title.trim() : "Cuộc trò chuyện mới";
        this.pinnedProvider = "wayjet";
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        if (title != null && !title.isBlank()) {
            this.title = title.trim();
        }
    }

    public String getPinnedProvider() {
        return pinnedProvider;
    }

    public void setPinnedProvider(String pinnedProvider) {
        this.pinnedProvider = pinnedProvider;
    }

    public String getPinnedModel() {
        return pinnedModel;
    }

    public void setPinnedModel(String pinnedModel) {
        this.pinnedModel = pinnedModel;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
