# build-content-library.ps1
# Fills all four Supabase content tables across multiple themed batches.
# Uses smaller per-call counts to stay safely within Gemini's output limit.
# Edit $secret below then run:  .\build-content-library.ps1

$secret = "kidventure2026"
$url = "https://kidsventure.vercel.app/api/content/generate"

# Each theme runs TWICE — once for math+logic, once for flashcards+stories.
# Smaller counts per call = no MAX_TOKENS truncation.
$themes = @(
  @{ skillCeiling = 1; themes = @("school", "friends") },
  @{ skillCeiling = 2; themes = @("badminton", "swimming") },
  @{ skillCeiling = 2; themes = @("animals", "nature") },
  @{ skillCeiling = 2; themes = @("space", "planets") },
  @{ skillCeiling = 3; themes = @("cooking", "shopping") },
  @{ skillCeiling = 3; themes = @("travel", "festivals") }
)

$totalMath = 0; $totalLogic = 0; $totalCards = 0; $totalStories = 0; $totalErrors = 0

function Invoke-Batch($label, $body) {
  Write-Host "  $label..." -NoNewline
  try {
    $resp = Invoke-RestMethod -Uri $url -Method POST `
      -Headers @{ "x-admin-secret" = $secret } `
      -ContentType "application/json" `
      -Body ($body | ConvertTo-Json)

    if ($resp.errors -and $resp.errors.Count -gt 0) {
      Write-Host " ERRORS: $($resp.errors -join '; ')" -ForegroundColor Yellow
      $script:totalErrors += $resp.errors.Count
    } else {
      Write-Host " OK" -ForegroundColor Green
    }
    $script:totalMath    += $resp.mathInserted
    $script:totalLogic   += $resp.logicInserted
    $script:totalCards   += $resp.flashcardsInserted
    $script:totalStories += $resp.storiesInserted
  } catch {
    Write-Host " FAILED: $($_.Exception.Message)" -ForegroundColor Red
    $script:totalErrors++
  }
  Start-Sleep -Seconds 4  # stay well under free-tier rate limits
}

foreach ($b in $themes) {
  $themeStr = $b.themes -join ","
  Write-Host "Batch: skill=$($b.skillCeiling) themes=$themeStr"

  # Call 1: math + logic only (no flashcards/stories)
  Invoke-Batch "math+logic" @{
    skillCeiling   = $b.skillCeiling
    themes         = $b.themes
    mode           = "advanced"
    mathCount      = 5
    logicCount     = 8
    flashcardCount = 0
    storyCount     = 0
  }

  # Call 2: flashcards only
  Invoke-Batch "flashcards" @{
    skillCeiling   = $b.skillCeiling
    themes         = $b.themes
    mode           = "advanced"
    mathCount      = 0
    logicCount     = 0
    flashcardCount = 6
    storyCount     = 0
  }

  # Call 3: stories only (kept small — stories are long)
  Invoke-Batch "stories" @{
    skillCeiling   = $b.skillCeiling
    themes         = $b.themes
    mode           = "advanced"
    mathCount      = 0
    logicCount     = 0
    flashcardCount = 0
    storyCount     = 2
  }
}

Write-Host ""
Write-Host "===== DONE =====" -ForegroundColor Cyan
Write-Host "math:      $totalMath"
Write-Host "logic:     $totalLogic"
Write-Host "flashcards:$totalCards"
Write-Host "stories:   $totalStories"
if ($totalErrors -gt 0) {
  Write-Host "errors:    $totalErrors (check output above)" -ForegroundColor Yellow
}
