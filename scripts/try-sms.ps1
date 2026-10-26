# Parses SMS text with the app's real parser, no phone or app needed.
#   .\scripts\try-sms.ps1                       -> uses scripts\my-sms.txt
#   .\scripts\try-sms.ps1 -File C:\path\x.txt   -> your own file
#   .\scripts\try-sms.ps1 -Text "Rs. 500 spent at KFC on card ending 1234"
#   .\scripts\try-sms.ps1 -Text "HBL|Rs. 500 spent at KFC"   (sender before |)
param(
  [string]$File = (Join-Path $PSScriptRoot 'my-sms.txt'),
  [string]$Text
)

$root = Split-Path $PSScriptRoot -Parent
if ($Text) {
  $File = Join-Path $env:TEMP 'try-sms-input.txt'
  Set-Content -Path $File -Value $Text -Encoding UTF8
}
if (-not (Test-Path $File)) { Write-Error "File not found: $File"; exit 1 }

Write-Host "Note: messages are treated as received today, so 'date in SMS' shows '-' for dates older than ~13 months." -ForegroundColor DarkGray
$env:TRY_SMS_FILE = (Resolve-Path $File).Path
Push-Location $root
try {
  npx vitest run scripts/trySms.test.ts --disableConsoleIntercept --reporter=dot 2>&1 |
    Where-Object { $_ -notmatch '^\s*$|RUN |Test Files|Tests |Start at|Duration|Isolate|isolate' }
} finally {
  Pop-Location
  Remove-Item Env:TRY_SMS_FILE -ErrorAction SilentlyContinue
}
