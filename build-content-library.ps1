# build-content-library.ps1
# Run this ONCE to build a deep, varied content library in one go, instead
# of one small batch at a time. Loops the generation endpoint across many
# different theme combinations so the library doesn't feel repetitive.
#
# USAGE: edit $secret below, then run:  .\build-content-library.ps1

$secret = "PASTE_YOUR_CONTENT_ADMIN_SECRET_HERE"
$url = "https://kidsventure.vercel.app/api/content/generate"

$batches = @(
  @{ skillCeiling = 1; themes = @("school","friends") },
  @{ skillCeiling = 2; themes = @("badminton","swimming") },
  @{ skillCeiling = 2; themes = @("animals","nature") },
  @{ skillCeiling = 2; themes = @("space","planets") },
  @{ skillCeiling = 3; themes = @("cooking","shopping") },
  @{ skillCeiling = 3; themes = @("travel","festivals") }
)

$totalMath = 0; $totalLogic = 0; $totalCards = 0; $totalStories = 0

foreach ($b in $batches) {
  Write-Host "Generating batch: skill=$($b.skillCeiling) themes=$($b.themes -join ',')..."
  try {
    $body = @{
      skillCeiling   = $b.skillCeiling
      themes         = $b.themes
      mode           = "advanced"
      mathCount      = 20
      logicCount     = 20
      flashcardCount = 25
      storyCount     = 3
    } | ConvertTo-Json

    $resp = Invoke-RestMethod -Uri $url -Method POST `
      -Headers @{ "x-admin-secret" = $secret } `
      -ContentType "application/json" `
      -Body $body

    if ($resp.errors -and $resp.errors.Count -gt 0) {
      Write-Host "  Errors: $($resp.errors -join '; ')" -ForegroundColor Yellow
    }
    Write-Host "  math=$($resp.mathInserted) logic=$($resp.logicInserted) cards=$($resp.flashcardsInserted) stories=$($resp.storiesInserted)" -ForegroundColor Green

    $totalMath += $resp.mathInserted
    $totalLogic += $resp.logicInserted
    $totalCards += $resp.flashcardsInserted
    $totalStories += $resp.storiesInserted
  } catch {
    Write-Host "  Batch failed: $($_.Exception.Message)" -ForegroundColor Red
  }

  Start-Sleep -Seconds 5  # polite pause between calls, well under free-tier rate limits
}

Write-Host ""
Write-Host "DONE. Totals across all batches:"
Write-Host "  math problems:   $totalMath"
Write-Host "  logic patterns:  $totalLogic"
Write-Host "  flashcards:      $totalCards"
Write-Host "  stories:         $totalStories"
