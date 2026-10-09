# Generates production secrets for MonsterASP / runasp / Render.
# Does NOT write files — copy the printed values into the hosting Environment Variables UI.

Write-Host ""
Write-Host "Paste these into the hosting control panel (Environment variables), then Restart application."
Write-Host ""

$enc = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$ip  = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$jwt = -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 48 | ForEach-Object { [char]$_ })

Write-Host "ASPNETCORE_ENVIRONMENT=Production"
Write-Host "Frontend__BaseUrl=https://qrcar.pages.dev"
Write-Host "Jwt__Issuer=QrCar.Api"
Write-Host "Jwt__Audience=QrCar.Client"
Write-Host "Jwt__AccessTokenMinutes=60"
Write-Host "Jwt__SigningKey=$jwt"
Write-Host "Security__EncryptionKey=$enc"
Write-Host "Security__IpHashKey=$ip"
Write-Host ""
Write-Host "Also set ConnectionStrings__DefaultConnection to the MSSQL string from your hosting panel."
Write-Host "Do not commit these values to git."
Write-Host ""
