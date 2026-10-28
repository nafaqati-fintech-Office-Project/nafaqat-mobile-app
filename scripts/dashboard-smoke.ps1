# Checks the dashboard endpoints through the API gateway with known numbers, no phone or app needed.
#   .\scripts\dashboard-smoke.ps1                                  -> http://localhost:8080
#   .\scripts\dashboard-smoke.ps1 -BaseUrl http://192.168.1.20:8080
# Registers one throwaway user (dash_<random>), adds 3 expenses (400.00 in total) and 1 income (1000.00)
# dated now, then calls the same endpoints the app calls. Needs the auth, transaction, reports, budget,
# subscription and user services behind the gateway. Tokens are never printed.
param(
  [string]$BaseUrl = 'http://localhost:8080'
)

$ErrorActionPreference = 'Stop'
$failed = 0

function Call([string]$Method, [string]$Path, $Body, [string]$Token) {
  $headers = @{}
  if ($Token) { $headers['Authorization'] = "Bearer $Token" }
  $args = @{ Uri = "$BaseUrl$Path"; Method = $Method; Headers = $headers; UseBasicParsing = $true }
  if ($null -ne $Body) { $args['ContentType'] = 'application/json'; $args['Body'] = ($Body | ConvertTo-Json) }
  try {
    $response = Invoke-WebRequest @args
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
$user = "dash_$id"
$password = 'Passw0rd!smoke'

$r = Call 'Post' '/api/auth/register' @{ username = $user; email = "$user@example.com"; firstName = 'Dash'; password = $password }
Check 'register' ($r.Status -eq 201) "status $($r.Status)"
$r = Call 'Post' '/api/auth/login' @{ identifier = $user; password = $password; rememberMe = $false }
Check 'login' ($r.Status -eq 200 -and $r.Json.accessToken) "status $($r.Status)"
$token = $r.Json.accessToken

$now = (Get-Date).ToUniversalTime()
$stamp = $now.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'")
$today = $now.ToString('yyyy-MM-dd')
$monthStart = $now.ToString('yyyy-MM-01')
$monthEnd = (Get-Date -Year $now.Year -Month $now.Month -Day 1).AddMonths(1).AddDays(-1).ToString('yyyy-MM-dd')

$rows = @(
  @{ amount = 100.50; type = 'DEBIT';  merchant = 'KFC';        description = 'Lunch' },
  @{ amount = 250;    type = 'DEBIT';  merchant = 'Carrefour';  description = 'Groceries' },
  @{ amount = 49.50;  type = 'DEBIT';  merchant = 'Netflix';    description = 'Subscription' },
  @{ amount = 1000;   type = 'CREDIT'; merchant = 'Employer';   description = 'Salary' }
)
$created = 0
foreach ($row in $rows) {
  $row['currency'] = 'PKR'
  $row['transactionDate'] = $stamp
  $r = Call 'Post' '/api/transactions' $row $token
  if ($r.Status -eq 201) { $created++ }
}
Check 'create 4 transactions' ($created -eq 4) "created $created of 4"

$range = "startDate=$monthStart&endDate=$monthEnd&timeZone=UTC"
$r = Call 'Get' "/api/reports/income-vs-expenses?$range" $null $token
$pkr = $r.Json.currencies | Where-Object { $_.currency -eq 'PKR' }
Check 'income-vs-expenses: 400 spent, 1000 income, 600 net' ($r.Status -eq 200 -and [decimal]$pkr.totalExpenses -eq 400 -and [decimal]$pkr.totalIncome -eq 1000 -and [decimal]$pkr.net -eq 600) "status $($r.Status)"

$r = Call 'Get' "/api/reports/spending-summary?$range" $null $token
$pkr = $r.Json.currencies | Where-Object { $_.currency -eq 'PKR' }
Check 'spending-summary: 3 expenses' ($r.Status -eq 200 -and [int]$pkr.transactionCount -eq 3) "status $($r.Status)"

$r = Call 'Get' "/api/reports/daily-spending?startDate=$today&endDate=$today&timeZone=UTC" $null $token
$pkr = $r.Json.currencies | Where-Object { $_.currency -eq 'PKR' }
Check 'daily-spending: 400 today' ($r.Status -eq 200 -and [decimal]($pkr.days | Select-Object -First 1).total -eq 400) "status $($r.Status)"

$r = Call 'Get' '/api/budgets/current' $null $token
Check 'budgets/current: 404 means no budget (normal)' ($r.Status -eq 404 -or $r.Status -eq 200) "status $($r.Status)"

$r = Call 'Get' '/api/subscriptions/summary' $null $token
Check 'subscriptions/summary answers 200' ($r.Status -eq 200) "status $($r.Status)"

$r = Call 'Get' '/api/users/me/preferences' $null $token
Check 'users/me/preferences: 404 means not saved yet (normal)' ($r.Status -eq 404 -or $r.Status -eq 200) "status $($r.Status)"

$r = Call 'Get' "/api/reports/income-vs-expenses?$range" $null $null
Check 'reports without a token return 401' ($r.Status -eq 401) "status $($r.Status)"

if ($failed -gt 0) { Write-Host "`n$failed check(s) failed." -ForegroundColor Red; exit 1 }
Write-Host "`nAll checks passed." -ForegroundColor Green
