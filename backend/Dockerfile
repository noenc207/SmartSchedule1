FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src ./src
RUN mvn -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /workspace/target/smartschedule-api-0.1.0-SNAPSHOT.jar app.jar
RUN useradd --system --create-home smartschedule
USER smartschedule
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
