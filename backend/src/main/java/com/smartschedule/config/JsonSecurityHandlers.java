package com.smartschedule.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartschedule.common.error.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Instant;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;

@Configuration
public class JsonSecurityHandlers {
    @Bean
    AuthenticationEntryPoint authenticationEntryPoint(ObjectMapper mapper) {
        return (request, response, exception) ->
                write(mapper, response, 401, "UNAUTHORIZED", "Authentication required.", request, exception);
    }

    @Bean
    AccessDeniedHandler accessDeniedHandler(ObjectMapper mapper) {
        return (request, response, exception) ->
                write(mapper, response, 403, "FORBIDDEN", "You do not have permission to access this resource.", request, exception);
    }

    private static void write(ObjectMapper mapper, HttpServletResponse response, int status, String code,
                              String message, HttpServletRequest request, Exception exception) throws java.io.IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        mapper.writeValue(response.getOutputStream(),
                new ApiError(Instant.now(), status, code, message, request.getRequestURI(), Map.of()));
    }
}
