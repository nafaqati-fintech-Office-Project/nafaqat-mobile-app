# Checks the auth backend through the API gateway, no phone or app needed.
#   .\scripts\auth-smoke.ps1                                  -> http://localhost:8080
#   .\scripts\auth-smoke.ps1 -BaseUrl http://192.168.1.20:8080
# Creates one throwaway user (smoke_<random>) each run. Tokens are never printed.
param(
  [string]$BaseUrl = 'http://localhost:8080'
)

$ErrorActionPreference = 'Stop'
$failed = 0

function Call([string]$Path, $Body, [string]$Token) {
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  try {
    $response = Invoke-WebRequest -Uri "$BaseUrl$Path" -Method Post -ContentType 'application/json' `
      -Headers $headers -Body ($Body | ConvertTo-Json) -UseBasicParsing
    return @{ Status = [int]$response.StatusCode; Json = ($response.Content | ConvertFrom-Json) }
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
$user = "smoke_$id"
$email = "$user@example.com"
$password = 'Passw0rd!smoke'

$health = try { (Invoke-WebRequest -Uri "$BaseUrl/actuator/health" -UseBasicParsing).StatusCode } catch { 0 }
Check 'gateway health' ($health -eq 200) "status $health, is the gateway running at ${BaseUrl}?"

$r = Call '/api/auth/register' @{ username = $user; email = $email; firstName = 'Smoke'; password = $password }
Check 'register returns 201' ($r.Status -eq 201) "status $($r.Status)"

$r = Call '/api/auth/register' @{ username = $user; email = $email; firstName = 'Smoke'; password = $password }
Check 'register again returns 409' ($r.Status -eq 409) "status $($r.Status)"

$r = Call '/api/auth/login' @{ identifier = $user; password = 'wrong-password'; rememberMe = $false }
Check 'wrong password returns 401' ($r.Status -eq 401) "status $($r.Status)"

$r = Call '/api/auth/login' @{ identifier = $user; password = $password; rememberMe = $false }
Check 'login returns 200 with tokens' ($r.Status -eq 200 -and $r.Json.accessToken -and $r.Json.refreshToken) "status $($r.Status)"
$access = $r.Json.accessToken
$refresh = $r.Json.refreshToken

$r = Call '/api/auth/refresh' @{ refreshToken = $refresh }
Check 'refresh returns 200 and rotates the token' ($r.Status -eq 200 -and $r.Json.refreshToken -and $r.Json.refreshToken -ne $refresh) "status $($r.Status)"

$r = Call '/api/auth/refresh' @{ refreshToken = $refresh }
Check 'old refresh token is rejected (401)' ($r.Status -eq 401) "status $($r.Status)"

$r = Call '/api/auth/forgot-password' @{ email = $email }
Check 'forgot-password returns 200' ($r.Status -eq 200) "status $($r.Status)"

$r = Call '/api/auth/logout-all' @{} $access
Check 'logout-all with a JWT returns 200' ($r.Status -eq 200) "status $($r.Status)"

$r = Call '/api/auth/logout-all' @{}
Check 'logout-all without a JWT returns 401' ($r.Status -eq 401) "status $($r.Status)"

if ($failed -gt 0) { Write-Host "`n$failed check(s) failed." -ForegroundColor Red; exit 1 }
Write-Host "`nAll checks passed." -ForegroundColor Green

