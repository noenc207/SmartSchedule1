package com.smartschedule.common.error;

import com.smartschedule.auth.application.AuthException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(AuthException.class)
    ResponseEntity<ApiError> auth(AuthException exception, HttpServletRequest request) {
        int status = switch (exception.getCode()) {
            case "FORBIDDEN", "INVALID_ACTIVATION_KEY", "REGISTRATION_DISABLED",
                 "INVALID_REGISTRATION_KEY", "REGISTRATION_KEY_REQUIRED",
                 "REGISTRATION_KEY_ALREADY_USED", "REGISTRATION_KEY_EXPIRED" -> 403;
            case "EMAIL_ALREADY_REGISTERED" -> 409;
            case "TOO_MANY_REQUESTS" -> 429;
            default -> 401;
        };
        return response(status, exception.getCode(), exception.getMessage(), request, Map.of());
    }

    @ExceptionHandler(DomainException.class)
    ResponseEntity<ApiError> domain(DomainException exception, HttpServletRequest request) {
        return response(exception.getStatus(), exception.getCode(), exception.getMessage(), request, Map.of());
    }

    @ExceptionHandler(BadCredentialsException.class)
    ResponseEntity<ApiError> badCredentials(BadCredentialsException exception, HttpServletRequest request) {
        return response(401, "UNAUTHORIZED", "Invalid email or password.", request, Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        Map<String, String> fields = exception.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(FieldError::getField, error -> error.getDefaultMessage() == null ? "Invalid value" : error.getDefaultMessage(),
                        (first, second) -> first));
        return response(422, "VALIDATION_ERROR", "The request contains invalid fields.", request, fields);
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> unexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled exception for {}: {}", request.getRequestURI(), exception.getMessage(), exception);
        return response(500, "INTERNAL_ERROR", "An unexpected error occurred: " + exception.getMessage(), request, Map.of());
    }

    private ResponseEntity<ApiError> response(int status, String code, String message,
                                              HttpServletRequest request, Map<String, String> fields) {
        return ResponseEntity.status(status).body(new ApiError(Instant.now(), status, code, message,
                request.getRequestURI(), fields));
    }
}
