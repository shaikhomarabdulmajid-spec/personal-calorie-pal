# Test Additional Features (Analytics, Food Search, etc.)
param(
    [string]$BaseUrl = "http://localhost:3001",
    [string]$AuthToken = $env:TEST_AUTH_TOKEN
)

Write-Host "🔍 Testing Additional Features..." -ForegroundColor Yellow

if (-not $AuthToken) {
    Write-Host "❌ No auth token provided. Run test-auth.ps1 first." -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $AuthToken" }

# Test 1: Analytics Dashboard
Write-Host "`n1. Testing Analytics Dashboard:" -ForegroundColor Cyan
try {
    $analyticsResponse = Invoke-RestMethod -Uri "$BaseUrl/analytics/dashboard" -Method GET -Headers $headers
    
    if ($analyticsResponse.success) {
        Write-Host "   ✅ Analytics dashboard retrieved successfully" -ForegroundColor Green
        Write-Host "   Daily trend entries: $($analyticsResponse.analytics.dailyTrend.Count)" -ForegroundColor Gray
        Write-Host "   Top foods: $($analyticsResponse.analytics.topFoods.Count)" -ForegroundColor Gray
        Write-Host "   Recommendations: $($analyticsResponse.recommendations.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Analytics dashboard failed: $($analyticsResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Analytics dashboard failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Weekly Summary
Write-Host "`n2. Testing Weekly Summary:" -ForegroundColor Cyan
try {
    $weeklyResponse = Invoke-RestMethod -Uri "$BaseUrl/analytics/weekly-summary" -Method GET -Headers $headers
    
    if ($weeklyResponse.success) {
        Write-Host "   ✅ Weekly summary retrieved successfully" -ForegroundColor Green
        Write-Host "   Total calories this week: $($weeklyResponse.summary.totalCalories)" -ForegroundColor Gray
        Write-Host "   Total meals: $($weeklyResponse.summary.totalMeals)" -ForegroundColor Gray
        Write-Host "   Daily breakdown entries: $($weeklyResponse.summary.dailyBreakdown.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Weekly summary failed: $($weeklyResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Weekly summary failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Food Search
Write-Host "`n3. Testing Food Search:" -ForegroundColor Cyan
try {
    $searchResponse = Invoke-RestMethod -Uri "$BaseUrl/foods/search?q=apple" -Method GET -Headers $headers
    
    if ($searchResponse.success) {
        Write-Host "   ✅ Food search successful" -ForegroundColor Green
        Write-Host "   Results found: $($searchResponse.foods.Count)" -ForegroundColor Gray
        if ($searchResponse.foods.Count -gt 0) {
            Write-Host "   First result: $($searchResponse.foods[0].name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   ❌ Food search failed: $($searchResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Food search failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Food Categories
Write-Host "`n4. Testing Food Categories:" -ForegroundColor Cyan
try {
    $categoriesResponse = Invoke-RestMethod -Uri "$BaseUrl/foods/categories" -Method GET -Headers $headers
    
    if ($categoriesResponse.success) {
        Write-Host "   ✅ Food categories retrieved successfully" -ForegroundColor Green
        Write-Host "   Categories found: $($categoriesResponse.categories.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Food categories failed: $($categoriesResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Food categories failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Popular Foods
Write-Host "`n5. Testing Popular Foods:" -ForegroundColor Cyan
try {
    $popularResponse = Invoke-RestMethod -Uri "$BaseUrl/foods/popular" -Method GET -Headers $headers
    
    if ($popularResponse.success) {
        Write-Host "   ✅ Popular foods retrieved successfully" -ForegroundColor Green
        Write-Host "   Popular foods: $($popularResponse.foods.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Popular foods failed: $($popularResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Popular foods failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Health Check
Write-Host "`n6. Testing Health Check:" -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET
    
    if ($healthResponse.success) {
        Write-Host "   ✅ Health check successful" -ForegroundColor Green
        Write-Host "   Version: $($healthResponse.version)" -ForegroundColor Gray
        Write-Host "   Environment: $($healthResponse.environment)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Health check failed: $($healthResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: API Root Documentation
Write-Host "`n7. Testing API Documentation:" -ForegroundColor Cyan
try {
    $docsResponse = Invoke-RestMethod -Uri "$BaseUrl/" -Method GET
    
    if ($docsResponse) {
        Write-Host "   ✅ API documentation accessible" -ForegroundColor Green
    } else {
        Write-Host "   ❌ API documentation failed" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ API documentation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Rate Limiting
Write-Host "`n8. Testing Rate Limiting:" -ForegroundColor Cyan
$rateLimitHit = $false
try {
    1..10 | ForEach-Object {
        try {
            Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET | Out-Null
        } catch {
            if ($_.Exception.Response.StatusCode.value__ -eq 429) {
                $script:rateLimitHit = $true
            }
        }
    }
    
    if ($rateLimitHit) {
        Write-Host "   ✅ Rate limiting is working" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Rate limiting not triggered (might be configured for higher limits)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ❌ Rate limiting test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n✅ Additional features tests completed!" -ForegroundColor Green