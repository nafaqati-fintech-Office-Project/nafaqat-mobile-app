# Checks the notification endpoints the app calls, through the API gateway, no phone or app needed.
#   .\scripts\notifications-smoke.ps1                                  -> http://localhost:8080
#   .\scripts\notifications-smoke.ps1 -BaseUrl http://192.168.1.20:8080
# Registers one throwaway user (notif_<random>). A new user has no notifications, so this checks the shapes
# (list, unread count, read-all, preferences) and that a switch can be turned off and on, and that the
# mandatory ones cannot. Needs the auth and notification services behind the gateway. Tokens are never printed.
param(
  [string]$BaseUrl = 'http://localhost:8080'
)

$ErrorActionPreference = 'Stop'
$failed = 0

function Call([string]$Method, [string]$Path, $Body, [string]$Token) {
  $headers = @{ 'Accept-Language' = 'ar' }
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $args = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $args['ContentType'] = 'application/json'; $args['Body'] = ($Body | ConvertTo-Json -Depth 5) }
  try {
    $response = Invoke-WebRequest @args
    $json = if ($response.Content) { $response.Content | ConvertFrom-Json } else { $null }
    return @{ Status = [int]$response.StatusCode; Json = $json }
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
    return @{ Status = $status; Json = $null }
  }
}

function Check([string]$Name, [bool]$Ok, [string]$Detail) {
  if ($Ok) { Write-Host "PASS  $Name" -ForegroundColor Green }
  else { Write-Host "FAIL  $Name  ($Detail)" -ForegroundColor Red; $script:failed++ }
}

$id = -join ((48..57) + (97..122) | Get-Random -Count 8 | ForEach-Object { [char]$_ })
$user = "notif_$id"
$password = 'Passw0rd!smoke'

$r = Call 'Post' '/api/auth/register' @{ username = $user; email = "$user@example.com"; firstName = 'Notif'; password = $password }
Check 'register' ($r.Status -eq 201) "status $($r.Status)"
$r = Call 'Post' '/api/auth/login' @{ identifier = $user; password = $password; rememberMe = $false }
Check 'login' ($r.Status -eq 200 -and $r.Json.accessToken) "status $($r.Status)"
$token = $r.Json.accessToken
if (-not $token) { Write-Host 'No token: stopping.' -ForegroundColor Red; exit 1 }

$r = Call 'Get' '/api/notifications?page=0&size=20' $null $token
Check 'list (GET /api/notifications)' ($r.Status -eq 200 -and $null -ne $r.Json.content -and $r.Json.page -eq 0) "status $($r.Status)"

$r = Call 'Get' '/api/notifications/unread-count' $null $token
Check 'unread count is 0 for a new user' ($r.Status -eq 200 -and $r.Json.count -eq 0) "status $($r.Status), count $($r.Json.count)"

$r = Call 'Patch' '/api/notifications/read-all' $null $token
Check 'mark all read' ($r.Status -eq 200 -and $null -ne $r.Json.updatedCount) "status $($r.Status)"

$r = Call 'Get' '/api/notifications/preferences' $null $token
Check 'preferences list all 7 types' ($r.Status -eq 200 -and $r.Json.preferences.Count -eq 7) "status $($r.Status), $($r.Json.preferences.Count) types"

$r = Call 'Put' '/api/notifications/preferences' @{ preferences = @(@{ type = 'BUDGET_THRESHOLD'; enabled = $false }) } $token
$off = $r.Json.preferences | Where-Object { $_.type -eq 'BUDGET_THRESHOLD' }
Check 'turn a switch off' ($r.Status -eq 200 -and $off.enabled -eq $false) "status $($r.Status)"

$r = Call 'Put' '/api/notifications/preferences' @{ preferences = @(@{ type = 'BUDGET_THRESHOLD'; enabled = $true }) } $token
$on = $r.Json.preferences | Where-Object { $_.type -eq 'BUDGET_THRESHOLD' }
Check 'turn it back on' ($r.Status -eq 200 -and $on.enabled -eq $true) "status $($r.Status)"

$r = Call 'Put' '/api/notifications/preferences' @{ preferences = @(@{ type = 'SECURITY_ALERT'; enabled = $false }) } $token
Check 'security alerts cannot be turned off (400)' ($r.Status -eq 400) "status $($r.Status)"

$r = Call 'Delete' '/api/notifications/00000000-0000-0000-0000-000000000000' $null $token
Check 'deleting an unknown one is 404' ($r.Status -eq 404) "status $($r.Status)"

if ($failed -gt 0) { Write-Host "$failed check(s) failed" -ForegroundColor Red; exit 1 }
Write-Host 'All notification checks passed' -ForegroundColor Green
