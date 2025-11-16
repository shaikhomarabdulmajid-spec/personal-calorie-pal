# Test Meal Management Endpoints
param(
    [string]$BaseUrl = "http://localhost:3001",
    [string]$AuthToken = $env:TEST_AUTH_TOKEN
)

Write-Host "🍽️ Testing Meal Management Endpoints..." -ForegroundColor Yellow

if (-not $AuthToken) {
    Write-Host "❌ No auth token provided. Run test-auth.ps1 first." -ForegroundColor Red
    exit 1
}

$headers = @{ Authorization = "Bearer $AuthToken" }
$createdMealIds = @()

# Test 1: Create Meal
Write-Host "`n1. Testing Meal Creation:" -ForegroundColor Cyan
try {
    $mealData = @{
        foods = @(
            @{
                name = "Grilled Chicken"
                calories = 300
                nutrition = @{
                    protein = 35
                    carbs = 0
                    fat = 15
                    fiber = 0
                    sugar = 0
                }
                servingSize = @{
                    amount = 1
                    unit = "piece"
                }
                confidence = 0.95
            }
        )
        mealType = "lunch"
        notes = "Test meal from automated testing"
    } | ConvertTo-Json -Depth 5

    $mealResponse = Invoke-RestMethod -Uri "$BaseUrl/meals" -Method POST -Body $mealData -ContentType "application/json" -Headers $headers
    
    if ($mealResponse.success) {
        Write-Host "   ✅ Meal created successfully" -ForegroundColor Green
        Write-Host "   Meal ID: $($mealResponse.meal.id)" -ForegroundColor Gray
        Write-Host "   Total Calories: $($mealResponse.meal.totalCalories)" -ForegroundColor Gray
        $createdMealIds += $mealResponse.meal.id
    } else {
        Write-Host "   ❌ Meal creation failed: $($mealResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Meal creation failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Get All Meals
Write-Host "`n2. Testing Get All Meals:" -ForegroundColor Cyan
try {
    $mealsResponse = Invoke-RestMethod -Uri "$BaseUrl/meals" -Method GET -Headers $headers
    
    if ($mealsResponse.success) {
        Write-Host "   ✅ Meals retrieved successfully" -ForegroundColor Green
        Write-Host "   Total meals: $($mealsResponse.meals.Count)" -ForegroundColor Gray
        Write-Host "   Total calories today: $($mealsResponse.totalCaloriesToday)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Get meals failed: $($mealsResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Get meals failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Get Specific Meal
if ($createdMealIds.Count -gt 0) {
    Write-Host "`n3. Testing Get Specific Meal:" -ForegroundColor Cyan
    try {
        $mealId = $createdMealIds[0]
        $singleMealResponse = Invoke-RestMethod -Uri "$BaseUrl/meals/$mealId" -Method GET -Headers $headers
        
        if ($singleMealResponse.success) {
            Write-Host "   ✅ Single meal retrieved successfully" -ForegroundColor Green
            Write-Host "   Meal Type: $($singleMealResponse.meal.mealType)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Get single meal failed: $($singleMealResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Get single meal failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 4: Update Meal
if ($createdMealIds.Count -gt 0) {
    Write-Host "`n4. Testing Meal Update:" -ForegroundColor Cyan
    try {
        $mealId = $createdMealIds[0]
        $updateData = @{
            notes = "Updated test meal"
            mealType = "dinner"
        } | ConvertTo-Json -Depth 3

        $updateResponse = Invoke-RestMethod -Uri "$BaseUrl/meals/$mealId" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers
        
        if ($updateResponse.success) {
            Write-Host "   ✅ Meal updated successfully" -ForegroundColor Green
            Write-Host "   New meal type: $($updateResponse.meal.mealType)" -ForegroundColor Gray
        } else {
            Write-Host "   ❌ Meal update failed: $($updateResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Meal update failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 5: Meal Progress
Write-Host "`n5. Testing Meal Progress:" -ForegroundColor Cyan
try {
    $progressResponse = Invoke-RestMethod -Uri "$BaseUrl/meals/progress" -Method GET -Headers $headers
    
    if ($progressResponse.success) {
        Write-Host "   ✅ Progress retrieved successfully" -ForegroundColor Green
        Write-Host "   Today's calories: $($progressResponse.today.totalCalories)" -ForegroundColor Gray
        Write-Host "   This week's calories: $($progressResponse.thisWeek.totalCalories)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Progress retrieval failed: $($progressResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Progress retrieval failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Delete Meal
if ($createdMealIds.Count -gt 0) {
    Write-Host "`n6. Testing Meal Deletion:" -ForegroundColor Cyan
    try {
        $mealId = $createdMealIds[0]
        $deleteResponse = Invoke-RestMethod -Uri "$BaseUrl/meals/$mealId" -Method DELETE -Headers $headers
        
        if ($deleteResponse.success) {
            Write-Host "   ✅ Meal deleted successfully" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Meal deletion failed: $($deleteResponse.message)" -ForegroundColor Red
        }
    } catch {
        Write-Host "   ❌ Meal deletion failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 7: Invalid Meal Data
Write-Host "`n7. Testing Invalid Meal Data:" -ForegroundColor Cyan
try {
    $invalidMealData = @{
        foods = @()  # Empty foods array should fail
        mealType = "invalid_type"
    } | ConvertTo-Json -Depth 3

    $invalidResponse = Invoke-RestMethod -Uri "$BaseUrl/meals" -Method POST -Body $invalidMealData -ContentType "application/json" -Headers $headers
    Write-Host "   ❌ Should have failed but didn't" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "   ✅ Invalid meal data correctly rejected (400)" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  Invalid meal data rejected with status: $statusCode" -ForegroundColor Yellow
    }
}

Write-Host "`n✅ Meal management tests completed!" -ForegroundColor Green