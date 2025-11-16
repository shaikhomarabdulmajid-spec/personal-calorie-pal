# Comprehensive API Test
$baseUrl = "http://localhost:3001"
$testUsername = "testuser_$(Get-Date -Format 'yyyyMMddHHmmss')"
$testPassword = "testpassword123"

Write-Host "🧪 Comprehensive API Test Suite" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Test 1: Health Check
Write-Host "`n1. Health Check:" -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    if ($healthResponse.success) {
        Write-Host "   ✅ Health check passed" -ForegroundColor Green
        Write-Host "   Server version: $($healthResponse.version)" -ForegroundColor Gray
        Write-Host "   Environment: $($healthResponse.environment)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: API Documentation
Write-Host "`n2. API Documentation:" -ForegroundColor Cyan
try {
    $docsResponse = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
    if ($docsResponse.success) {
        Write-Host "   ✅ Documentation accessible" -ForegroundColor Green
        Write-Host "   API version: $($docsResponse.version)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Documentation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: User Registration
Write-Host "`n3. User Registration:" -ForegroundColor Cyan
try {
    $registerData = @{
        username = $testUsername
        password = $testPassword
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    
    if ($registerResponse.success) {
        Write-Host "   ✅ Registration successful" -ForegroundColor Green
        Write-Host "   User ID: $($registerResponse.user.id)" -ForegroundColor Gray
        Write-Host "   Username: $($registerResponse.user.username)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Registration failed: $($registerResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Registration error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: User Login
Write-Host "`n4. User Login:" -ForegroundColor Cyan
$global:authToken = $null
try {
    $loginData = @{
        username = $testUsername
        password = $testPassword
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    
    if ($loginResponse.success -and $loginResponse.token) {
        Write-Host "   ✅ Login successful" -ForegroundColor Green
        Write-Host "   Token length: $($loginResponse.token.Length) characters" -ForegroundColor Gray
        $global:authToken = $loginResponse.token
    } else {
        Write-Host "   ❌ Login failed: $($loginResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Login error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Protected Route (Get Profile)
Write-Host "`n5. Protected Route Access:" -ForegroundColor Cyan
if ($global:authToken) {
    try {
        $headers = @{ Authorization = "Bearer $global:authToken" }
        $profileResponse = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method GET -Headers $headers
        
        if ($profileResponse.success) {
            Write-Host "   ✅ Profile access successful" -ForegroundColor Green
            Write-Host "   Profile username: $($profileResponse.user.username)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Profile access failed: $($profileResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Profile access error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no auth token)" -ForegroundColor Yellow
}

# Test 6: Meal Creation
Write-Host "`n6. Meal Creation:" -ForegroundColor Cyan
if ($global:authToken) {
    try {
        $mealData = @{
            foods = @(
                @{
                    name = "Test Apple"
                    calories = 80
                    nutrition = @{
                        protein = 0
                        carbs = 21
                        fat = 0
                        fiber = 4
                        sugar = 16
                    }
                    servingSize = @{
                        amount = 1
                        unit = "piece"
                    }
                    confidence = 0.95
                }
            )
            mealType = "snack"
            notes = "API test meal"
        } | ConvertTo-Json -Depth 5

        $headers = @{ Authorization = "Bearer $global:authToken" }
        $mealResponse = Invoke-RestMethod -Uri "$baseUrl/meals/logMeal" -Method POST -Body $mealData -ContentType "application/json" -Headers $headers
        
        if ($mealResponse.success) {
            Write-Host "   ✅ Meal created successfully" -ForegroundColor Green
            Write-Host "   Meal ID: $($mealResponse.meal.id)" -ForegroundColor Gray
            Write-Host "   Total calories: $($mealResponse.meal.totalCalories)" -ForegroundColor Gray
            $global:testMealId = $mealResponse.meal.id
        } else {
            Write-Host "   ❌ Meal creation failed: $($mealResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Meal creation error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no auth token)" -ForegroundColor Yellow
}

# Test 7: Get Meals
Write-Host "`n7. Get User Meals:" -ForegroundColor Cyan
if ($global:authToken) {
    try {
        $headers = @{ Authorization = "Bearer $global:authToken" }
        $mealsResponse = Invoke-RestMethod -Uri "$baseUrl/meals/history" -Method GET -Headers $headers
        
        if ($mealsResponse.success) {
            Write-Host "   ✅ Meals retrieved successfully" -ForegroundColor Green
            Write-Host "   Meal count: $($mealsResponse.meals.Count)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Get meals failed: $($mealsResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Get meals error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no auth token)" -ForegroundColor Yellow
}

# Test 8: Analytics
Write-Host "`n8. Analytics Dashboard:" -ForegroundColor Cyan
if ($global:authToken) {
    try {
        $headers = @{ Authorization = "Bearer $global:authToken" }
        $analyticsResponse = Invoke-RestMethod -Uri "$baseUrl/analytics/dashboard" -Method GET -Headers $headers
        
        if ($analyticsResponse.success) {
            Write-Host "   ✅ Analytics retrieved successfully" -ForegroundColor Green
            Write-Host "   Daily trend items: $($analyticsResponse.analytics.dailyTrend.Count)" -ForegroundColor Gray
            if ($analyticsResponse.aiSuggestions) {
                Write-Host "   ✅ AI suggestions are present." -ForegroundColor Green
                Write-Host "   First suggestion: $($analyticsResponse.aiSuggestions[0])" -ForegroundColor Gray
            } else {
                Write-Host "   ❌ AI suggestions are missing." -ForegroundColor Red
            }
        } else {
            Write-Host "   ❌ Analytics failed: $($analyticsResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Analytics error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no auth token)" -ForegroundColor Yellow
}

# Test 9: Food Search
Write-Host "`n9. Food Search:" -ForegroundColor Cyan
try {
    $searchResponse = Invoke-RestMethod -Uri "$baseUrl/foods/search?q=apple" -Method GET
    
    if ($searchResponse.success) {
        Write-Host "   ✅ Food search successful" -ForegroundColor Green
        Write-Host "   Results found: $($searchResponse.foods.Count)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Food search failed: $($searchResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Food search error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 10: Cleanup - Delete Test Meal
Write-Host "`n10. Cleanup (Delete Test Meal):" -ForegroundColor Cyan
if ($global:authToken -and $global:testMealId) {
    try {
        $headers = @{ Authorization = "Bearer $global:authToken" }
        $deleteResponse = Invoke-RestMethod -Uri "$baseUrl/meals/$($global:testMealId)" -Method DELETE -Headers $headers
        
        if ($deleteResponse.success) {
            Write-Host "   ✅ Test meal deleted successfully" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Meal deletion failed: $($deleteResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Meal deletion error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "   ⏭️  Skipped (no meal to delete)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Comprehensive test completed!" -ForegroundColor Green
Write-Host "Check results above for any failures." -ForegroundColor Gray