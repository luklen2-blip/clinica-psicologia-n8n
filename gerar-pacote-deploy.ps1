# Script Gerador de Pacote de Deploy 24/7 para Nuvem (Luciano Standard)
$ErrorActionPreference = "Stop"

$ProjectDir = $PSScriptRoot
$ZipName = "CLINICA_PSICOLOGIA_N8N_DEPLOY.zip"

Write-Host "=================================================="
Write-Host "GERANDO PACOTE LIMPO PARA DEPLOY NA NUVEM"
Write-Host "=================================================="

# Diretorios de destino na Area de Trabalho
$Destinations = @(
  [System.IO.Path]::Combine($env:USERPROFILE, "Desktop"),
  [System.IO.Path]::Combine($env:USERPROFILE, "OneDrive", "Desktop")
)

# Cria arquivo ZIP temporario
$TempZip = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), $ZipName)
if (Test-Path $TempZip) { Remove-Item $TempZip -Force }

# Cria pasta temporaria para organizar fontes limpos
$TempFolder = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "clinica_n8n_src_" + [System.Guid]::NewGuid().ToString().Substring(0,8))
New-Item -ItemType Directory -Path $TempFolder | Out-Null

Write-Host "Copiando fontes essenciais..."

$ExcludePatterns = @("node_modules", ".git", "*.log", ".system_generated", "scratch", ".env")

Get-ChildItem -Path $ProjectDir | ForEach-Object {
  $itemName = $_.Name
  $shouldExclude = $false
  foreach ($pattern in $ExcludePatterns) {
    if ($itemName -like $pattern) { $shouldExclude = $true; break }
  }
  if (-not $shouldExclude) {
    Copy-Item -Path $_.FullName -Destination $TempFolder -Recurse -Force
  }
}

Write-Host "Compactando arquivos em $ZipName..."
Compress-Archive -Path "$TempFolder\*" -DestinationPath $TempZip -Force

# Copia para as Areas de Trabalho existentes
foreach ($dest in $Destinations) {
  if (Test-Path $dest) {
    $finalPath = [System.IO.Path]::Combine($dest, $ZipName)
    Copy-Item -Path $TempZip -Destination $finalPath -Force
    Write-Host "[OK] Pacote gerado com sucesso em: $finalPath"
  }
}

# Limpeza temporaria
Remove-Item $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item $TempFolder -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=================================================="
Write-Host "Pacote pronto para upload no Render, Railway ou GitHub!"
Write-Host "=================================================="
