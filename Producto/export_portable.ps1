# Script de Exportacion Literatus - Version Estable
$today = Get-Date -Format "yyyyMMdd_HHmm"
$BackupName = "export_$today"
$BackupDir = Join-Path $PWD $BackupName
New-Item -ItemType Directory -Path $BackupDir -Force

Write-Host "--- INICIANDO RESPALDO ---" -ForegroundColor Cyan

# 1. Base de Datos
Write-Host "1. Exportando Base de Datos..."
$envFile = "backend/.env"
if (Test-Path $envFile) {
    $dbUrl = Select-String -Path $envFile -Pattern "DATABASE_URL=postgres://(.*?):(.*?)\@(.*?):(.*?)/(.*)"
    if ($dbUrl) {
        $user = $dbUrl.Matches[0].Groups[1].Value
        $pass = $dbUrl.Matches[0].Groups[2].Value
        $host_name = $dbUrl.Matches[0].Groups[3].Value
        $port = $dbUrl.Matches[0].Groups[4].Value
        $dbName = $dbUrl.Matches[0].Groups[5].Value

        $env:PGPASSWORD = $pass
        pg_dump -h $host_name -p $port -U $user -F c -b -v -f "$BackupDir/literatus_db.backup" $dbName
        $env:PGPASSWORD = $null
        Write-Host "DB OK." -ForegroundColor Green
    }
}

# 2. Media
Write-Host "2. Comprimiendo Media..."
$mediaPath = "backend/media"
if (Test-Path $mediaPath) {
    Compress-Archive -Path "$mediaPath\*" -DestinationPath "$BackupDir/media_assets.zip" -Force
    Write-Host "Media OK." -ForegroundColor Green
}

# 3. Scripts de setup y datos de categorias
Write-Host "3. Copiando scripts y datos de setup..."
$masterJson = "backend/elejandria_master.json"
if (Test-Path $masterJson) {
    Copy-Item $masterJson -Destination "$BackupDir/elejandria_master.json"
    Write-Host "elejandria_master.json OK." -ForegroundColor Green
}
Copy-Item "backend/bulk_db_injection.py" -Destination "$BackupDir/bulk_db_injection.py" -ErrorAction SilentlyContinue

# 4. Finalizar
Copy-Item $envFile -Destination "$BackupDir/env_reference.txt"
$size = (Get-ChildItem $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum
$mb = [Math]::Round($size / 1MB, 2)

Write-Host "--- COMPLETO ---" -ForegroundColor Green
Write-Host "Carpeta: $BackupName"
Write-Host "Peso: $mb MB"
