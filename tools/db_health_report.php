<?php
/**
 * ==============================================================================
 * SmartSchedule Auxiliary Diagnostic Tool - PostgreSQL Health & Concurrency Report
 * ==============================================================================
 * Scope & Policy:
 * Standalone read-only command-line utility for system administrators.
 * Performs deep PostgreSQL health checks, connection pool utilization audits,
 * table bloat analysis, and lock contention inspection.
 *
 * SAFETY GUARANTEE:
 * Sets transaction to READ ONLY on connection. Does NOT modify any data.
 *
 * Usage:
 *   php tools/db_health_report.php [--json] [--host=localhost] [--db=smartschedule]
 * ==============================================================================
 */

declare(strict_types=1);

// Parse CLI options
$options = getopt('', ['json', 'host::', 'port::', 'db::', 'user::', 'password::', 'help']);

if (isset($options['help'])) {
    echo <<<HELP
SmartSchedule PostgreSQL Health & Concurrency Diagnostic Tool

Usage:
  php tools/db_health_report.php [options]

Options:
  --host=<host>        PostgreSQL host (default: localhost or env POSTGRES_HOST)
  --port=<port>        PostgreSQL port (default: 5432 or env POSTGRES_PORT)
  --db=<name>          Database name (default: smartschedule or env POSTGRES_DB)
  --user=<user>        Database user (default: smartschedule or env POSTGRES_USER)
  --password=<pass>    Database password (default: smartschedule or env POSTGRES_PASSWORD)
  --json               Output report in machine-readable JSON format
  --help               Display this help text

HELP;
    exit(0);
}

$host = $options['host'] ?? getenv('POSTGRES_HOST') ?: 'localhost';
$port = $options['port'] ?? getenv('POSTGRES_PORT') ?: '5432';
$db   = $options['db']   ?? getenv('POSTGRES_DB')   ?: 'smartschedule';
$user = $options['user'] ?? getenv('POSTGRES_USER') ?: 'smartschedule';
$pass = $options['password'] ?? getenv('POSTGRES_PASSWORD') ?: 'smartschedule';
$isJson = isset($options['json']);

$dsn = "pgsql:host={$host};port={$port};dbname={$db};";

try {
    $pdo = new PDO($dsn, $user, $pass, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT            => 5,
    ]);
    // Enforce read-only transaction for absolute safety
    $pdo->exec("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;");
} catch (PDOException $e) {
    if ($isJson) {
        echo json_encode(['status' => 'ERROR', 'message' => $e->getMessage()]);
    } else {
        echo "\033[1;31m[ERROR]\033[0m Failed to connect to PostgreSQL: " . $e->getMessage() . PHP_EOL;
    }
    exit(1);
}

$report = [
    'timestamp' => date('c'),
    'database' => $db,
    'host' => "{$host}:{$port}",
    'status' => 'OK',
];

// 1. PostgreSQL Version & Start Time
$verStmt = $pdo->query("SELECT version() AS pg_ver, pg_postmaster_start_time() AS start_time;");
$verData = $verStmt->fetch();
$report['pg_version'] = $verData['pg_ver'];
$report['uptime_since'] = $verData['start_time'];

// 2. Max Connections & Current Connection Pool States
$maxConnStmt = $pdo->query("SHOW max_connections;");
$maxConn = (int) $maxConnStmt->fetchColumn();
$report['max_connections'] = $maxConn;

$connStateStmt = $pdo->query("
    SELECT COALESCE(state, 'unknown') as state, count(*) as count
    FROM pg_stat_activity
    WHERE datname = current_database()
    GROUP BY state;
");
$connStates = [];
$totalActive = 0;
while ($row = $connStateStmt->fetch()) {
    $connStates[$row['state']] = (int) $row['count'];
    $totalActive += (int) $row['count'];
}
$report['connections'] = [
    'total_in_use' => $totalActive,
    'max_configured' => $maxConn,
    'utilization_pct' => round(($totalActive / max(1, $maxConn)) * 100, 2),
    'by_state' => $connStates,
];

// 3. Cache Hit Ratio
$cacheStmt = $pdo->query("
    SELECT
      sum(heap_blks_read) as blks_read,
      sum(heap_blks_hit)  as blks_hit,
      round(sum(heap_blks_hit) * 100.0 / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as cache_hit_pct
    FROM pg_statio_user_tables;
");
$cacheData = $cacheStmt->fetch();
$report['buffer_cache_hit_pct'] = (float) ($cacheData['cache_hit_pct'] ?? 100.0);

// 4. Core Tables Statistics (Live vs Dead Tuples, Sizes)
$tableStmt = $pdo->query("
    SELECT
      relname AS table_name,
      n_live_tup AS live_tuples,
      n_dead_tup AS dead_tuples,
      round(n_dead_tup * 100.0 / nullif(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_pct,
      last_autovacuum,
      pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
      pg_size_pretty(pg_relation_size(relid)) AS table_size,
      pg_size_pretty(pg_indexes_size(relid)) AS index_size
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC;
");
$report['tables'] = $tableStmt->fetchAll();

// 5. Index Usage Efficiency (Seq Scans vs Index Scans on Core Entities)
$idxStmt = $pdo->query("
    SELECT
      relname AS table_name,
      seq_scan,
      seq_tup_read,
      idx_scan,
      idx_tup_fetch,
      CASE WHEN (seq_scan + idx_scan) > 0 
           THEN round(idx_scan * 100.0 / (seq_scan + idx_scan), 2) 
           ELSE 100.00 END as index_usage_pct
    FROM pg_stat_user_tables
    WHERE relname IN ('events', 'tasks', 'schedules', 'schedule_members', 'activity_logs', 'users')
    ORDER BY relname ASC;
");
$report['index_efficiency'] = $idxStmt->fetchAll();

// 6. Lock Contention & Blocked Queries
$lockStmt = $pdo->query("
    SELECT
      blocked_locks.pid     AS blocked_pid,
      blocked_activity.usename  AS blocked_user,
      blocking_locks.pid    AS blocking_pid,
      blocking_activity.usename AS blocking_user,
      blocked_activity.query    AS blocked_statement,
      blocking_activity.query   AS blocking_statement
    FROM  pg_catalog.pg_locks         blocked_locks
    JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
    JOIN pg_catalog.pg_locks         blocking_locks 
        ON blocking_locks.locktype = blocked_locks.locktype
        AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
        AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
        AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
        AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
        AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
        AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
        AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
        AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
        AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
        AND blocking_locks.pid != blocked_locks.pid
    JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
    WHERE NOT blocked_locks.granted;
");
$report['blocked_queries'] = $lockStmt->fetchAll();

// 7. Output Formatter
if ($isJson) {
    header('Content-Type: application/json');
    echo json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit(0);
}

// CLI Colored Banner & Table Output
echo PHP_EOL;
echo "\033[1;36m========================================================================\033[0m" . PHP_EOL;
echo "\033[1;36m      SMARTSCHEDULE POSTGRESQL HEALTH & CONCURRENCY REPORT              \033[0m" . PHP_EOL;
echo "\033[1;36m========================================================================\033[0m" . PHP_EOL;
echo " Target DB      : \033[1;33m{$report['database']}\033[0m ({$report['host']})" . PHP_EOL;
echo " Server Version : " . substr($report['pg_version'], 0, 50) . "..." . PHP_EOL;
echo " Cache Hit Rate          : \033[1;32m{$report['buffer_cache_hit_pct']}%\033[0m" . PHP_EOL;
echo " PostgreSQL Server Conns : {$report['connections']['total_in_use']} / {$report['connections']['max_configured']} (SHOW max_connections) " .
     "(\033[1;32m{$report['connections']['utilization_pct']}%\033[0m)" . PHP_EOL;
echo " State Breakdown: " . json_encode($report['connections']['by_state']) . PHP_EOL;
echo "------------------------------------------------------------------------" . PHP_EOL;
echo "\033[1;37mTABLE STORAGE & BLOAT (DEAD TUPLES)\033[0m" . PHP_EOL;
printf("%-20s | %10s | %10s | %10s | %10s | %10s\n", "Table", "Live Tups", "Dead Tups", "Dead %", "Table Size", "Index Size");
echo str_repeat('-', 78) . PHP_EOL;
foreach ($report['tables'] as $t) {
    $deadPct = (float) ($t['dead_tuple_pct'] ?? 0);
    $color = $deadPct > 15 ? "\033[1;31m" : "\033[0m";
    printf("%-20s | %10d | %10d | %s%9.1f%%\033[0m | %10s | %10s\n",
        substr($t['table_name'], 0, 20),
        $t['live_tuples'],
        $t['dead_tuples'],
        $color,
        $deadPct,
        $t['table_size'],
        $t['index_size']
    );
}
echo "------------------------------------------------------------------------" . PHP_EOL;
echo "\033[1;37mINDEX EFFICIENCY (SEQ SCAN VS INDEX SCAN)\033[0m" . PHP_EOL;
printf("%-20s | %10s | %10s | %12s\n", "Table", "Seq Scans", "Idx Scans", "Idx Usage %");
echo str_repeat('-', 60) . PHP_EOL;
foreach ($report['index_efficiency'] as $ie) {
    $idxPct = (float) $ie['index_usage_pct'];
    $color = $idxPct < 70 ? "\033[1;33m" : "\033[1;32m";
    printf("%-20s | %10d | %10d | %s%11.1f%%\033[0m\n",
        $ie['table_name'],
        $ie['seq_scan'],
        $ie['idx_scan'],
        $color,
        $idxPct
    );
}
echo "------------------------------------------------------------------------" . PHP_EOL;
echo "\033[1;37mLOCK CONTENTION & BLOCKED QUERIES\033[0m" . PHP_EOL;
if (empty($report['blocked_queries'])) {
    echo "\033[1;32m✓ No transactions currently blocked. Concurrency health is optimal.\033[0m" . PHP_EOL;
} else {
    echo "\033[1;31m⚠ DETECTED BLOCKED TRANSACTIONS:\033[0m" . PHP_EOL;
    foreach ($report['blocked_queries'] as $b) {
        echo "  Blocked PID: {$b['blocked_pid']} ({$b['blocked_user']}) by Blocking PID: {$b['blocking_pid']} ({$b['blocking_user']})" . PHP_EOL;
        echo "  Blocked Query: {$b['blocked_statement']}" . PHP_EOL;
    }
}
echo "\033[1;36m========================================================================\033[0m" . PHP_EOL;
