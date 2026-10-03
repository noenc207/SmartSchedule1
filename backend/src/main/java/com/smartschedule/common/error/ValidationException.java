package com.smartschedule.common.error;

public class ValidationException extends DomainException {
    public ValidationException(String message) {
        super("VALIDATION_ERROR", 400, message);
    }

    public ValidationException(String code, String message) {
        super(code, 400, message);
    }
}
