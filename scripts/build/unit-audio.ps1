param(
  [string]$OutDir = "eval/units/audio",
  [string]$Manifest = "eval/units/manifest.json",
  [string]$TermsFile = "eval/units/terms.json"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$source = Get-Content (Join-Path (Get-Location) $TermsFile) -Raw | ConvertFrom-Json

$null = New-Item -ItemType Directory -Force -Path $OutDir
$voices = @("Microsoft David Desktop", "Microsoft Zira Desktop")
$items = New-Object System.Collections.Generic.List[object]
$index = 0

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

foreach ($entry in $source.items) {
  $voice = $voices[$index % $voices.Count]
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($voice)
  $synth.Rate = 0
  $slug = ($entry.expected -replace '[^a-zA-Z0-9]', '')
  $name = "{0:d3}-{1}.wav" -f $index, $slug
  $path = Join-Path $OutDir $name
  $synth.SetOutputToWaveFile($path, $format)
  $synth.Speak($entry.phrase)
  $synth.Dispose()

  $items.Add([ordered]@{
    file       = "$OutDir/$name"
    spoken     = $entry.expected
    carrier    = $entry.phrase
    voice      = $voice
    entityType = "strength"
  })
  $index += 1
}

$payload = [ordered]@{
  builtAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
  method  = $source.method
  caveat  = $source.caveat
  voices  = $voices
  count   = $items.Count
  items   = $items
}

$null = New-Item -ItemType Directory -Force -Path (Split-Path $Manifest)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $Manifest), ($payload | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))

Write-Output "wrote $($items.Count) wav files at 16 kHz to $OutDir"
Write-Output "manifest: $Manifest"
