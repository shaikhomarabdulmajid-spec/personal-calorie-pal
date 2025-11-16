# Simple Authentication Test
$baseUrl = "http://localhost:3001"
$testUsername = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')"
$testPassword = "testpassword123"

Write-Host "Testing Authentication..." -ForegroundColor Yellow

# Test Registration
Write-Host "`n1. Testing Registration:" -ForegroundColor Cyan
try {
    $registerData = @{
        username = $testUsername
        password = $testPassword
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    
    if ($registerResponse.success) {
        Write-Host "   Registration successful" -ForegroundColor Green
        Write-Host "   User ID: $($registerResponse.user.id)" -ForegroundColor Gray
    } else {
        Write-Host "   Registration failed: $($registerResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   Registration error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Login
Write-Host "`n2. Testing Login:" -ForegroundColor Cyan
try {
    $loginData = @{
        username = $testUsername
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success -and $loginResponse.token) {
        Write-Host "   Login successful" -ForegroundColor Green
        Write-Host "   Token: $($loginResponse.token.Substring(0, 20))..." -ForegroundColor Gray
        $global:testToken = $loginResponse.token
    } else {
        Write-Host "   Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   Login error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Protected Route
Write-Host "`n3. Testing Protected Route:" -ForegroundColor Cyan
if ($global:testToken) {
    try {
        $headers = @{ Authorization = "Bearer $global:testToken" }
        $meResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
        
        if ($meResponse.success) {
            Write-Host "   Protected route access successful" -ForegroundColor Green
            Write-Host "   Username: $($meResponse.user.username)" -ForegroundColor Gray
        } else {
            Write-Host "   Protected route failed: $($meResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   Protected route error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   Skipped (no token)" -ForegroundColor Yellow
}

Write-Host "`nAuthentication test completed!" -ForegroundColor Green