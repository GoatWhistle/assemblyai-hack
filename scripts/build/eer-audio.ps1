param(
  [string]$OutDir = "eval/dev/audio",
  [string]$Manifest = "eval/dev/manifest.json",
  [string]$TermsFile = "",
  [int]$Rate = 0
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$terms = New-Object System.Collections.Generic.List[string]
if ($TermsFile -ne "") {
  $loaded = (Get-Content (Join-Path (Get-Location) $TermsFile) -Raw | ConvertFrom-Json).terms
  foreach ($t in $loaded) { $terms.Add($t) }
} else {
  $pairsFile = Join-Path (Get-Location) "data/lasa-pairs.json"
  $pairs = (Get-Content $pairsFile -Raw | ConvertFrom-Json).pairs
  foreach ($p in $pairs) {
    $terms.Add($p.termA)
    $terms.Add($p.termB)
  }
}

$null = New-Item -ItemType Directory -Force -Path $OutDir
$voices = @("Microsoft David Desktop", "Microsoft Zira Desktop")
$items = New-Object System.Collections.Generic.List[object]
$index = 0

foreach ($term in $terms) {
  $voice = $voices[$index % $voices.Count]
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($voice)
  $synth.Rate = $Rate
  $name = "{0:d3}-{1}.wav" -f $index, ($term -replace '[^a-zA-Z0-9]', '')
  $path = Join-Path $OutDir $name
  $synth.SetOutputToWaveFile($path)
  $synth.Speak("The drug name is $term.")
  $synth.Dispose()

  $items.Add([ordered]@{
    file       = "$OutDir/$name"
    spoken     = $term
    carrier    = "The drug name is $term."
    voice      = $voice
    entityType = "drug_name"
  })
  $index += 1
}

$payload = [ordered]@{
  builtAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  method  = "Windows System.Speech synthesis in a fixed carrier phrase, two en-US voices alternating, rate $Rate"
  caveat  = "Synthetic speech. This measures the recognizer against a synthesizer, not against human speech."
  voices  = $voices
  count   = $items.Count
  items   = $items
}

$null = New-Item -ItemType Directory -Force -Path (Split-Path $Manifest)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $Manifest), ($payload | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))

Write-Output "wrote $($items.Count) wav files to $OutDir"
Write-Output "manifest: $Manifest"
