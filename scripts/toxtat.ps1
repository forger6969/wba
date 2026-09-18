# ---------------------------------------------------------------
#  WBA serverini to'xtatadi:   npm run toxta
#  -Baza  bilan: Supabase'ni ham to'xtatadi (xotira bo'shaydi,
#                ma'lumot saqlanib qoladi)
# ---------------------------------------------------------------
param([switch]$Baza)

$eski = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $eski) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
Write-Host ($(if ($eski) { "+ server to'xtatildi" } else { 'server ishlamayotgan edi' }))

if ($Baza) {
  Set-Location (Split-Path -Parent $PSScriptRoot)
  npx --yes supabase@latest stop | Out-Null
  Write-Host "+ baza to'xtatildi (ma'lumot saqlangan)"
}
