package com.smartschedule.common.error;

public class DomainException extends RuntimeException {
    private final String code;
    private final int status;

    public DomainException(String code, int status, String message) {
        super(message);
        this.code = code;
        this.status = status;
    }

    public String getCode() { return code; }
    public int getStatus() { return status; }
}
