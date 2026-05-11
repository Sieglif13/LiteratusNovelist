param(
    [Parameter(Mandatory=$true)]
    [string]$BackupPath
)

Write-Host "--- INICIANDO IMPORTACION ---" -ForegroundColor Cyan

if (-not (Test-Path $BackupPath)) {
    Write-Host "Error: No se encuentra la carpeta $BackupPath" -ForegroundColor Red
    return
}

# 1. Media
Write-Host "1. Sincronizando archivos Media..."
$zipPath = Join-Path $BackupPath "media_assets.zip"
$destMedia = "backend/media"

if (Test-Path $zipPath) {
    if (-not (Test-Path $destMedia)) { New-Item -ItemType Directory -Path $destMedia -Force }
    Expand-Archive -Path $zipPath -DestinationPath $destMedia -Force
    Write-Host "Archivos sincronizados." -ForegroundColor Green
}

# 2. Base de Datos
Write-Host "2. Restaurando Base de Datos..."
$dbBackup = Join-Path $BackupPath "literatus_db.backup"
$envFile = "backend/.env"

if (Test-Path $dbBackup) {
    if (Test-Path $envFile) {
        $dbUrl = Select-String -Path $envFile -Pattern "DATABASE_URL=postgres://(.*?):(.*?)\@(.*?):(.*?)/(.*)"
        if ($dbUrl) {
            $user = $dbUrl.Matches[0].Groups[1].Value
            $pass = $dbUrl.Matches[0].Groups[2].Value
            $host_name = $dbUrl.Matches[0].Groups[3].Value
            $port = $dbUrl.Matches[0].Groups[4].Value
            $dbName = $dbUrl.Matches[0].Groups[5].Value

            $env:PGPASSWORD = $pass
            
            Write-Host "Limpiando conexiones activas..."
            $sqlTerm = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$dbName' AND pid != pg_backend_pid();"
            psql -h $host_name -p $port -U $user -c "$sqlTerm" -d postgres
            
            Write-Host "Recreando base de datos..."
            dropdb -h $host_name -p $port -U $user $dbName --if-exists
            createdb -h $host_name -p $port -U $user $dbName
            
            Write-Host "Inyectando datos..."
            pg_restore -h $host_name -p $port -U $user -d $dbName -v "$dbBackup"
            
            $env:PGPASSWORD = $null
            Write-Host "Base de datos OK." -ForegroundColor Green
        }
    }
}

Write-Host "--- PROCESO FINALIZADO ---" -ForegroundColor Green
