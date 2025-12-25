# Test FL API Endpoints
Write-Host "🧪 Testing HealthLedger FL API" -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:5001"

# Test 1: Health Check
Write-Host "1️⃣  Testing Health Check..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET
$health = $response.Content | ConvertFrom-Json
Write-Host "   Status: $($health.status)" -ForegroundColor Green
Write-Host "   Environment: $($health.environment)" -ForegroundColor Green
Write-Host ""

# Test 2: Get All FL Models
Write-Host "2️⃣  Getting All FL Models..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "$baseUrl/api/fl/models" -Method GET
$models = $response.Content | ConvertFrom-Json
Write-Host "   Found $($models.models.Count) models" -ForegroundColor Green
Write-Host ""

# Test 3: Create New FL Model
Write-Host "3️⃣  Creating New FL Model (CVD)..." -ForegroundColor Cyan
$body = @{
    disease = "cvd"
    modelType = "neural_network"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/fl/models" `
        -Method POST `
        -Body $body `
        -ContentType "application/json"
    
    $newModel = $response.Content | ConvertFrom-Json
    Write-Host "   ✅ Model Created!" -ForegroundColor Green
    Write-Host "   Model ID: $($newModel.modelId.Substring(0,10))..." -ForegroundColor Yellow
    Write-Host "   Disease: $($newModel.disease)" -ForegroundColor Yellow
    Write-Host ""
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

# Test 4: Get All Models Again
Write-Host "4️⃣  Getting All FL Models (After Creation)..." -ForegroundColor Cyan
$response = Invoke-WebRequest -Uri "$baseUrl/api/fl/models" -Method GET
$models = $response.Content | ConvertFrom-Json
Write-Host "   Found $($models.models.Count) models" -ForegroundColor Green
foreach ($model in $models.models) {
    Write-Host "   - $($model.disease) ($($model.model_type))" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "✨ API Testing Complete!" -ForegroundColor Green
