param(
  [string]$OutDir = "eval/native16/audio",
  [string]$Manifest = "eval/native16/manifest.json",
  [string]$TermsFile = "eval/control/terms.json"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$loaded = (Get-Content (Join-Path (Get-Location) $TermsFile) -Raw | ConvertFrom-Json).terms

$null = New-Item -ItemType Directory -Force -Path $OutDir
$voices = @("Microsoft David Desktop", "Microsoft Zira Desktop")
$items = New-Object System.Collections.Generic.List[object]
$index = 0

$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)

foreach ($term in $loaded) {
  $voice = $voices[$index % $voices.Count]
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($voice)
  $synth.Rate = 0
  $name = "{0:d3}-{1}.wav" -f $index, ($term -replace '[^a-zA-Z0-9]', '')
  $path = Join-Path $OutDir $name
  $synth.SetOutputToWaveFile($path, $format)
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
  method  = "Windows System.Speech synthesised directly at 16 kHz mono PCM16, so no resampling happens before the socket; same terms, voices and carrier phrase as eval/control"
  caveat  = "Synthetic speech. This arm exists to separate recognizer error from resampling loss in our own pipeline."
  voices  = $voices
  count   = $items.Count
  items   = $items
}

$null = New-Item -ItemType Directory -Force -Path (Split-Path $Manifest)
[System.IO.File]::WriteAllText((Join-Path (Get-Location) $Manifest), ($payload | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))

Write-Output "wrote $($items.Count) wav files at 16 kHz to $OutDir"
Write-Output "manifest: $Manifest"
