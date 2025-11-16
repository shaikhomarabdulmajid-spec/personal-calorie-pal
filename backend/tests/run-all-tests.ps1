# Master Test Script - Run All Tests
param(
    [string]$BaseUrl = "http://localhost:3001",
    [switch]$SkipDatabase = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Continue"
$testResults = @{
    Environment = $false
    Database = $false
    Authentication = $false
    Meals = $false
    Features = $false
    Overall = $false
}

Write-Host "🚀 Personal Calorie Pal - Comprehensive Test Suite" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host "Base URL: $BaseUrl" -ForegroundColor Yellow
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor Gray

# Check if server is running
Write-Host "`n🔍 Checking if server is running..." -ForegroundColor Cyan
try {
    $serverCheck = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET -TimeoutSec 5
    if ($serverCheck.success) {
        Write-Host "✅ Server is running on $BaseUrl" -ForegroundColor Green
        Write-Host "   Version: $($serverCheck.version)" -ForegroundColor Gray
        Write-Host "   Environment: $($serverCheck.environment)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Server is not running on $BaseUrl" -ForegroundColor Red
    Write-Host "Please start the server with: npm start" -ForegroundColor Yellow
    exit 1
}

# Phase 1: Environment Testing
Write-Host "`n📋 Phase 1: Environment Testing" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
try {
    & ".\tests\test-environment.ps1"
    $testResults.Environment = $true
    Write-Host "✅ Environment tests passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Environment tests failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Environment = $false
}

# Phase 2: Database Testing
if (-not $SkipDatabase) {
    Write-Host "`n🗄️ Phase 2: Database Testing" -ForegroundColor Cyan
    Write-Host "=============================" -ForegroundColor Cyan
    try {
        node ".\tests\database.test.js"
        if ($LASTEXITCODE -eq 0) {
            $testResults.Database = $true
            Write-Host "✅ Database tests passed" -ForegroundColor Green
        } else {
            $testResults.Database = $false
            Write-Host "❌ Database tests failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Database tests failed: $($_.Exception.Message)" -ForegroundColor Red
        $testResults.Database = $false
    }
} else {
    Write-Host "`n⏭️ Phase 2: Database Testing (Skipped)" -ForegroundColor Yellow
    $testResults.Database = $true
}

# Phase 3: Authentication Testing
Write-Host "`n🔐 Phase 3: Authentication Testing" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
try {
    & ".\tests\test-auth.ps1" -BaseUrl $BaseUrl
    $testResults.Authentication = $true
    Write-Host "✅ Authentication tests passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication tests failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Authentication = $false
}

# Phase 4: Meal Management Testing
Write-Host "`n🍽️ Phase 4: Meal Management Testing" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
try {
    & ".\tests\test-meals.ps1" -BaseUrl $BaseUrl -AuthToken $env:TEST_AUTH_TOKEN
    $testResults.Meals = $true
    Write-Host "✅ Meal management tests passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Meal management tests failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Meals = $false
}

# Phase 5: Additional Features Testing  
Write-Host "`n🔍 Phase 5: Additional Features Testing" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
try {
    & ".\tests\test-features.ps1" -BaseUrl $BaseUrl -AuthToken $env:TEST_AUTH_TOKEN
    $testResults.Features = $true
    Write-Host "✅ Additional features tests passed" -ForegroundColor Green
} catch {
    Write-Host "❌ Additional features tests failed: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Features = $false
}

# Test Results Summary
Write-Host "`n📊 Test Results Summary" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

$passedTests = 0
$totalTests = 0

foreach ($test in $testResults.Keys) {
    if ($test -eq "Overall") { continue }
    $totalTests++
    $status = if ($testResults[$test]) { "✅ PASSED"; $passedTests++ } else { "❌ FAILED" }
    $color = if ($testResults[$test]) { "Green" } else { "Red" }
    Write-Host "$($test.PadRight(15)): $status" -ForegroundColor $color
}

$testResults.Overall = ($passedTests -eq $totalTests)

Write-Host "`n🎯 Overall Result:" -ForegroundColor Cyan
if ($testResults.Overall) {
    Write-Host "🎉 ALL TESTS PASSED! ($passedTests/$totalTests)" -ForegroundColor Green
    Write-Host "Your Personal Calorie Pal API is working perfectly!" -ForegroundColor Green
} else {
    Write-Host "⚠️  SOME TESTS FAILED ($passedTests/$totalTests)" -ForegroundColor Yellow
    Write-Host "Please review the failed tests above and fix any issues." -ForegroundColor Yellow
}

# Performance Summary
Write-Host "`n⚡ Performance Summary:" -ForegroundColor Cyan
try {
    $start = Get-Date
    $perfTest = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
    $responseTime = (Get-Date) - $start
    Write-Host "Health endpoint response time: $($responseTime.TotalMilliseconds)ms" -ForegroundColor Gray
    
    if ($responseTime.TotalMilliseconds -lt 100) {
        Write-Host "✅ Excellent response time" -ForegroundColor Green
    } elseif ($responseTime.TotalMilliseconds -lt 500) {
        Write-Host "✅ Good response time" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Slow response time" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Could not measure performance" -ForegroundColor Red
}

Write-Host "`n🏁 Test Suite Completed at $(Get-Date)" -ForegroundColor Green