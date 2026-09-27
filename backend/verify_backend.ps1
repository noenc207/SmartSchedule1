# verify_backend.ps1 - Automated End-to-End Verification for SmartSchedule Backend
$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:8080/api/v1"

function Write-Step($name) {
    Write-Host "`n>>> [RUNNING] $name" -ForegroundColor Cyan
}

function Write-Pass($name) {
    Write-Host ">>> [PASSED] $name" -ForegroundColor Green
}

function Write-Fail($name, $msg) {
    Write-Host ">>> [FAILED] $name : $msg" -ForegroundColor Red
    exit 1
}

# 1. Health check
Write-Step "1. Health Endpoint"
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
if ($health.status -ne "UP") { Write-Fail "Health check" "Status is not UP: $($health.status)" }
Write-Pass "1. Health Endpoint ($($health.service), status=$($health.status))"

# 2. Register User A
Write-Step "2. Register User A"
$userAEmail = "user_a_$([Guid]::NewGuid().ToString().Substring(0,8))@example.com"
$regA = @{
    displayName = "User Alpha"
    email = $userAEmail
    password = "Password123!"
} | ConvertTo-Json
$authA = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regA -ContentType "application/json"
$tokenA = $authA.accessToken
$userAId = $authA.user.id
if (-not $tokenA) { Write-Fail "Register User A" "No access token" }
Write-Pass "2. Register User A ($userAEmail, ID: $userAId)"

# 3. Login User A
Write-Step "3. Login User A"
$loginA = @{
    email = $userAEmail
    password = "Password123!"
} | ConvertTo-Json
$authALogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginA -ContentType "application/json"
if (-not $authALogin.accessToken) { Write-Fail "Login User A" "Login failed" }
Write-Pass "3. Login User A successful"

# 4. Get Current User A
Write-Step "4. Auth /me for User A"
$headersA = @{ Authorization = "Bearer $tokenA" }
$meA = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers $headersA
if ($meA.email -ne $userAEmail) { Write-Fail "Auth /me" "Email mismatch" }
Write-Pass "4. Auth /me verified ($($meA.displayName))"

# 5. Register User B
Write-Step "5. Register User B"
$userBEmail = "user_b_$([Guid]::NewGuid().ToString().Substring(0,8))@example.com"
$regB = @{
    displayName = "User Beta"
    email = $userBEmail
    password = "Password123!"
} | ConvertTo-Json
$authB = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $regB -ContentType "application/json"
$tokenB = $authB.accessToken
$userBId = $authB.user.id
$headersB = @{ Authorization = "Bearer $tokenB" }
Write-Pass "5. Register User B ($userBEmail, ID: $userBId)"

# 6. User A creates Schedule
Write-Step "6. User A creates Schedule"
$schedReq = @{
    name = "Fall 2026 Academic Schedule"
    description = "Core semester schedule"
    timezone = "Asia/Ho_Chi_Minh"
    visibility = "PRIVATE"
} | ConvertTo-Json
$schedule = Invoke-RestMethod -Uri "$baseUrl/schedules" -Method Post -Body $schedReq -Headers $headersA -ContentType "application/json"
$schedId = $schedule.id
if (-not $schedId) { Write-Fail "Create Schedule" "No schedule ID returned" }
Write-Pass "6. Schedule created ($schedId, version=$($schedule.version))"

# 7. Multi-Tenant Isolation Check: User B attempts to access User A's schedule
Write-Step "7. Multi-Tenant Isolation: User B accesses User A's Schedule"
$isolated = $false
try {
    Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId" -Method Get -Headers $headersB
} catch {
    $status = $_.Exception.Response.StatusCode.value__
    if ($status -eq 403 -or $status -eq 404) {
        $isolated = $true
        Write-Pass "7. User B blocked with HTTP $status from User A's schedule"
    } else {
        Write-Fail "Isolation test" "Unexpected status: $status"
    }
}
if (-not $isolated) { Write-Fail "Isolation test" "User B accessed User A's schedule!" }

# 8. User A creates Category
Write-Step "8. User A creates Category"
$catReq = @{
    name = "Computer Science"
    color = "#3B82F6"
    icon = "laptop"
} | ConvertTo-Json
$category = Invoke-RestMethod -Uri "$baseUrl/categories" -Method Post -Body $catReq -Headers $headersA -ContentType "application/json"
$catId = $category.id
Write-Pass "8. Category created ($catId, name=$($category.name), color=$($category.color))"

# 9. User A creates Task
Write-Step "9. User A creates Task"
$taskReq = @{
    title = "Distributed Systems Assignment"
    description = "Implement Paxos consensus"
    estimatedDurationMinutes = 120
    remainingDurationMinutes = 120
    priority = "HIGH"
    status = "TODO"
    categoryId = $catId
} | ConvertTo-Json
$task = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/tasks" -Method Post -Body $taskReq -Headers $headersA -ContentType "application/json"
$taskId = $task.id
if ($task.remainingDurationMinutes -ne 120) { Write-Fail "Task creation" "Remaining minutes mismatch" }
Write-Pass "9. Task created ($taskId, est=120m, rem=$($task.remainingDurationMinutes)m)"

# 10. User A creates Event linked to Task (60 minutes)
Write-Step "10. Event -> Task Link: Create 60m event linked to task"
$eventReq = @{
    title = "Work on Paxos Phase 1"
    description = "Initial leader election implementation"
    startsAt = "2026-10-01T09:00:00Z"
    endsAt = "2026-10-01T10:00:00Z"
    categoryId = $catId
    sourceTaskId = $taskId
    priority = "HIGH"
    status = "SCHEDULED"
    fixed = $false
    locked = $false
} | ConvertTo-Json
$createdEvent = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/events" -Method Post -Body $eventReq -Headers $headersA -ContentType "application/json"
$eventId = $createdEvent.id
if ($createdEvent.sourceTaskId -ne $taskId) { Write-Fail "Event Task Link" "sourceTaskId not set on event response" }

# Verify Task remaining minutes automatically updated to 60!
$updatedTask = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId" -Method Get -Headers $headersA
if ($updatedTask.remainingDurationMinutes -ne 60) {
    Write-Fail "Duration Authority" "Expected remainingDurationMinutes=60, got $($updatedTask.remainingDurationMinutes)"
}
Write-Pass "10. Event created ($eventId) -> Task remainingDuration automatically updated to 60m!"

# 11. User A updates Event to 90 minutes
Write-Step "11. Event -> Task Link: Update event to 90m (endsAt 10:30)"
$eventReq90 = @{
    title = "Work on Paxos Phase 1 Extended"
    description = "Initial leader election implementation"
    startsAt = "2026-10-01T09:00:00Z"
    endsAt = "2026-10-01T10:30:00Z"
    categoryId = $catId
    sourceTaskId = $taskId
    priority = "HIGH"
    status = "SCHEDULED"
    fixed = $false
    locked = $false
} | ConvertTo-Json
$updatedEvent = Invoke-RestMethod -Uri "$baseUrl/events/$eventId" -Method Put -Body $eventReq90 -Headers $headersA -ContentType "application/json"
$taskAfter90 = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId" -Method Get -Headers $headersA
if ($taskAfter90.remainingDurationMinutes -ne 30) {
    Write-Fail "Duration Authority" "Expected remainingDurationMinutes=30, got $($taskAfter90.remainingDurationMinutes)"
}
Write-Pass "11. Event updated to 90m -> Task remainingDuration automatically updated to 30m!"

# 12. User A creates Custom Location
Write-Step "12. User A creates Custom UserLocation"
$locReq = @{
    name = "Campus Library Study Room 302"
    category = "CAMPUS"
    address = "123 University Ave"
    latitude = 10.772
    longitude = 106.690
    radiusMeters = 50
    building = "Central Library"
    room = "302"
    isFavorite = $true
} | ConvertTo-Json
$loc = Invoke-RestMethod -Uri "$baseUrl/locations" -Method Post -Body $locReq -Headers $headersA -ContentType "application/json"
$locId = $loc.id
if (-not $locId) { Write-Fail "Create Location" "No location ID returned" }
Write-Pass "12. Location created ($locId, name=$($loc.name), isCustom=$($loc.isCustom))"

# 13. User B location isolation
Write-Step "13. User B location isolation check"
$locsB = Invoke-RestMethod -Uri "$baseUrl/locations" -Method Get -Headers $headersB
$foundAInB = $locsB | Where-Object { $_.id -eq $locId }
if ($foundAInB) { Write-Fail "Location isolation" "User B can see User A's custom location!" }
Write-Pass "13. User B location list does NOT leak User A's private location"

# 14. User A updates & verifies location
Write-Step "14. User A updates location"
$locReqUpdate = @{
    name = "Campus Library Study Room 302 (Renovated)"
    category = "CAMPUS"
    latitude = 10.773
    longitude = 106.691
    radiusMeters = 60
} | ConvertTo-Json
$locUpdated = Invoke-RestMethod -Uri "$baseUrl/locations/$locId" -Method Put -Body $locReqUpdate -Headers $headersA -ContentType "application/json"
if ($locUpdated.name -ne "Campus Library Study Room 302 (Renovated)") { Write-Fail "Update Location" "Name not updated" }
Write-Pass "14. Location successfully updated"

# 15. Conflict Detection Check
Write-Step "15. Conflict detection endpoint"
$conflictCheck = Invoke-RestMethod -Uri "$baseUrl/events/check-conflict?scheduleId=$schedId&startsAt=2026-10-01T09:30:00Z&endsAt=2026-10-01T11:00:00Z" -Method Post -Headers $headersA
if (-not $conflictCheck.hasConflict) { Write-Fail "Conflict check" "Expected conflict with existing event" }
Write-Pass "15. Conflict detected properly (hasConflict=$($conflictCheck.hasConflict), conflicts=$($conflictCheck.conflicts.Count))"

# 16. Scheduling Availability, Generate, Validate, Apply, and Optimistic Locking
Write-Step "16. Scheduling Availability, Generate, Validate, and Apply"
$availReq = @{
    dayOfWeek = 5
    startTime = "08:00:00"
    endTime = "18:00:00"
    enabled = $true
} | ConvertTo-Json
$avail = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/availability" -Method Post -Body $availReq -Headers $headersA -ContentType "application/json"
Write-Pass "16a. Availability created for Friday 08:00-18:00"

$currentSched = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId" -Method Get -Headers $headersA

$genReq = @{
    from = "2026-10-02T08:00:00Z"
    to = "2026-10-02T18:00:00Z"
    granularityMinutes = 30
    taskIds = @($taskId)
} | ConvertTo-Json
$plan = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/scheduling/generate" -Method Post -Body $genReq -Headers $headersA -ContentType "application/json"
Write-Host "Generated plan with $($plan.slots.Count) slots, fingerprint=$($plan.fingerprint)"
if ($plan.slots.Count -eq 0) { Write-Fail "Scheduling generate" "Plan has 0 slots" }

# Validate proposal
$valReq = @{
    planId = $plan.planId
    fingerprint = $plan.fingerprint
    slots = $plan.slots
    scheduleVersion = $currentSched.version
} | ConvertTo-Json
$valRes = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/scheduling/validate" -Method Post -Body $valReq -Headers $headersA -ContentType "application/json"
if (-not $valRes.valid) { Write-Fail "Scheduling validate" "Plan validation failed: $($valRes.errors)" }
Write-Pass "16b. Plan validated successfully (valid=$($valRes.valid))"

# Apply proposal
$applyReq = @{
    planId = $plan.planId
    fingerprint = $plan.fingerprint
    slots = $plan.slots
    scheduleVersion = $currentSched.version
} | ConvertTo-Json
$appliedPlan = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/scheduling/apply" -Method Post -Body $applyReq -Headers $headersA -ContentType "application/json"
Write-Pass "16c. Plan applied successfully! Version incremented."

# Optimistic locking test: Re-applying with original (now stale) version must fail with 409
$staleCaught = $false
try {
    Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/scheduling/apply" -Method Post -Body $applyReq -Headers $headersA -ContentType "application/json"
} catch {
    $st = $_.Exception.Response.StatusCode.value__
    if ($st -eq 409) {
        $staleCaught = $true
        Write-Pass "16d. Stale schedule version correctly rejected with HTTP 409 Conflict"
    }
}
if (-not $staleCaught) { Write-Fail "Optimistic locking" "Stale version did not trigger 409 Conflict" }

# 17. User Profile Persistence
Write-Step "17. User Profile Update & Persistence"
$profUpdate = @{
    name = "Dr. Alpha User"
    timezone = "Asia/Tokyo"
    locale = "en-US"
} | ConvertTo-Json
$profRes = Invoke-RestMethod -Uri "$baseUrl/users/me" -Method Patch -Body $profUpdate -Headers $headersA -ContentType "application/json"
if ($profRes.name -ne "Dr. Alpha User" -or $profRes.timezone -ne "Asia/Tokyo") {
    Write-Fail "Profile update" "Profile response mismatch"
}
# Reload to guarantee DB persistence
$profReload = Invoke-RestMethod -Uri "$baseUrl/users/me" -Method Get -Headers $headersA
if ($profReload.name -ne "Dr. Alpha User" -or $profReload.timezone -ne "Asia/Tokyo") {
    Write-Fail "Profile persistence" "Database did not persist updated profile!"
}
Write-Pass "17. User profile updated and persisted to DB ($($profReload.name), $($profReload.timezone))"

# 18. Calendar ICS Export & Import
Write-Step "18. Calendar ICS Export and Import"
$icsExport = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/export.ics?from=2026-10-01T00:00:00Z&to=2026-10-05T00:00:00Z" -Method Get -Headers $headersA
if (-not $icsExport.Contains("BEGIN:VCALENDAR") -or -not $icsExport.Contains("BEGIN:VEVENT")) {
    Write-Fail "ICS Export" "Export does not contain standard VCALENDAR/VEVENT headers"
}
Write-Pass "18a. ICS Export produced valid iCalendar content"

$importReq = @{
    events = @(
        @{
            title = "Final Project Defense"
            startsAt = "2026-10-04T14:00:00Z"
            endsAt = "2026-10-04T15:00:00Z"
            description = "Capstone committee presentation"
            location = "Hall B"
        }
    )
    skipConflicts = $false
} | ConvertTo-Json
$importedCount = Invoke-RestMethod -Uri "$baseUrl/schedules/$schedId/import.ics/confirm" -Method Post -Body $importReq -Headers $headersA -ContentType "application/json"
if ($importedCount -ne 1) { Write-Fail "ICS Import" "Expected 1 imported event, got $importedCount" }
Write-Pass "18b. ICS Import confirmed 1 event"

# 19. Event Delete -> Task Duration Recalculation
Write-Step "19. Event Delete -> Task Duration Recalculation"
Invoke-RestMethod -Uri "$baseUrl/events/$eventId" -Method Delete -Headers $headersA
$taskAfterDelete = Invoke-RestMethod -Uri "$baseUrl/tasks/$taskId" -Method Get -Headers $headersA
if ($taskAfterDelete.remainingDurationMinutes -ne 90) {
    Write-Fail "Duration Reversion" "Expected remainingDurationMinutes=90 after deleting 90m event (30m applied event remains), got $($taskAfterDelete.remainingDurationMinutes)"
}
Write-Pass "19. Event deleted -> Task remaining duration properly recalculated to 90m!"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "ALL 19 END-TO-END RUNTIME VERIFICATION TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
