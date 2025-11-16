# Test Environment Setup and Dependencies
Write-Host "Testing Environment Setup..." -ForegroundColor Yellow

# Check Node.js version
Write-Host "`n1. Node.js Version Check:" -ForegroundColor Cyan
$nodeVersion = node --version
Write-Host "   Node.js: $nodeVersion" -ForegroundColor Green

# Check npm version
$npmVersion = npm --version
Write-Host "   npm: $npmVersion" -ForegroundColor Green

# Check if we're in the right directory
Write-Host "`n2. Directory Structure Check:" -ForegroundColor Cyan
$currentPath = Get-Location
Write-Host "   Current path: $currentPath" -ForegroundColor White

if (Test-Path "server.js") {
    Write-Host "   server.js found" -ForegroundColor Green
} else {
    Write-Host "   server.js not found" -ForegroundColor Red
}

if (Test-Path "package.json") {
    Write-Host "   package.json found" -ForegroundColor Green
} else {
    Write-Host "   package.json not found" -ForegroundColor Red
}

if (Test-Path "database.sqlite") {
    Write-Host "   database.sqlite found" -ForegroundColor Green
} else {
    Write-Host "   database.sqlite not found (will be created)" -ForegroundColor Yellow
}

# Check dependencies
Write-Host "`n3. Dependencies Check:" -ForegroundColor Cyan
try {
    $packageInfo = Get-Content "package.json" | ConvertFrom-Json
    $dependencies = $packageInfo.dependencies.PSObject.Properties.Name
    Write-Host "   Dependencies found: $($dependencies.Count)" -ForegroundColor Green
    
    # Check critical dependencies
    $criticalDeps = @("express", "sequelize", "sqlite3", "jsonwebtoken", "bcryptjs")
    foreach ($dep in $criticalDeps) {
        if ($dependencies -contains $dep) {
            Write-Host "   $dep OK" -ForegroundColor Green
        } else {
            Write-Host "   $dep missing" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "   Error reading package.json" -ForegroundColor Red
}

# Check environment variables
Write-Host "`n4. Environment Variables Check:" -ForegroundColor Cyan
if (Test-Path ".env") {
    Write-Host "   .env file found" -ForegroundColor Green
    $envContent = Get-Content ".env"
    $requiredVars = @("PORT", "DB_STORAGE", "JWT_SECRET")
    
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -like "$var=*" }
        if ($found) {
            Write-Host "   $var configured" -ForegroundColor Green
        } else {
            Write-Host "   $var missing" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   .env file not found" -ForegroundColor Red
}

Write-Host "`nEnvironment test completed!" -ForegroundColor Green