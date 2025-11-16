# Test Authentication Endpoints
param(
    [string]$BaseUrl = "http://localhost:3001"
)

Write-Host "🔐 Testing Authentication Endpoints..." -ForegroundColor Yellow

$testEmail = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
$testPassword = "testpassword123"
$testUsername = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')"

# Test 1: User Registration
Write-Host "`n1. Testing User Registration:" -ForegroundColor Cyan
try {
    $registerData = @{
        username = $testUsername
        password = $testPassword
    } | ConvertTo-Json -Depth 3

    $registerResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    
    if ($registerResponse.success) {
        Write-Host "   ✅ Registration successful" -ForegroundColor Green
        Write-Host "   User ID: $($registerResponse.user.id)" -ForegroundColor Gray
        Write-Host "   Username: $($registerResponse.user.username)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Registration failed: $($registerResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
    $global:authTestFailed = $true
}

# Test 2: User Login
Write-Host "`n2. Testing User Login:" -ForegroundColor Cyan
$global:authToken = $null
try {
    $loginData = @{
        username = $testUsername
        password = $testPassword
    } | ConvertTo-Json -Depth 3

    $loginResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success -and $loginResponse.token) {
        Write-Host "   ✅ Login successful" -ForegroundColor Green
        $global:authToken = $loginResponse.token
        Write-Host "   Token received: $($loginResponse.token.Substring(0, 20))..." -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    $global:authTestFailed = $true
}

# Test 3: Protected Route Access
Write-Host "`n3. Testing Protected Route Access:" -ForegroundColor Cyan
if ($global:authToken) {
    try {
        $headers = @{ Authorization = "Bearer $global:authToken" }
        $profileResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method GET -Headers $headers
        
        if ($profileResponse.success) {
            Write-Host "   ✅ Protected route access successful" -ForegroundColor Green
            Write-Host "   Profile retrieved for: $($profileResponse.user.username)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Protected route failed: $($profileResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Protected route failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no auth token)" -ForegroundColor Yellow
}

# Test 4: Invalid Login
Write-Host "`n4. Testing Invalid Login:" -ForegroundColor Cyan
try {
    $invalidLoginData = @{
        username = "nonexistent"
        password = "wrongpassword"
    } | ConvertTo-Json -Depth 3

    $invalidResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/login" -Method POST -Body $invalidLoginData -ContentType "application/json"
    Write-Host "   ❌ Should have failed but didn't" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Invalid login correctly rejected (401)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Invalid login rejected with status: $statusCode" -ForegroundColor Yellow
    }
}

# Test 5: Unauthorized Access
Write-Host "`n5. Testing Unauthorized Access:" -ForegroundColor Cyan
try {
    $unauthorizedResponse = Invoke-RestMethod -Uri "$BaseUrl/auth/me" -Method GET
    Write-Host "   ❌ Should have failed but didn't" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Write-Host "   ✅ Unauthorized access correctly rejected (401)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Unauthorized access rejected with status: $statusCode" -ForegroundColor Yellow
    }
}

if (-not $global:authTestFailed) {
    Write-Host "`n✅ Authentication tests completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Some authentication tests failed!" -ForegroundColor Red
}

# Export token for other tests
$env:TEST_AUTH_TOKEN = $global:authToken
Write-Host "`nAuth token exported to environment variable for other tests" -ForegroundColor Gray