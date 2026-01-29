#!/usr/bin/env powershell
# Oracle Cloud Credential Verification

Write-Host "IllyBoost Oracle Cloud Credential Verification" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Your current credentials are:" -ForegroundColor Yellow
$tfvars = @{
    "Tenancy OCID" = "ocid1.tenancy.oc1..aaaaaaaaxhg5qtxwxyaouivxe54uwlbdsvqvitentyrqvxvxf26eamy3miceq"
    "User OCID" = "ocid1.user.oc1..aaaaaaaanmjd56qn2mmzdqmoqgikatexvdjkplt3ah5v4l567mszvpixjfiq"
    "Fingerprint" = "97:51:15:1e:53:16:9c:3d:e7:0b:45:3b:c2:a4:80:c3"
    "Compartment OCID" = "ocid1.tenancy.oc1..aaaaaaaaxhg3qtxwxyaouivxe54wvlbdswqvjtentyxqwx6f26eamy3miceq"
}

$tfvars.GetEnumerator() | ForEach-Object {
    Write-Host "  $($_.Key): $($_.Value)" -ForegroundColor Green
}

Write-Host ""
Write-Host "IMPORTANT: Authentication is failing. This usually means:" -ForegroundColor Red
Write-Host "1. The Fingerprint doesn't match the downloaded private key" -ForegroundColor Yellow
Write-Host "2. The User OCID is incorrect" -ForegroundColor Yellow  
Write-Host "3. The private key is not the one matching the fingerprint" -ForegroundColor Yellow
Write-Host ""

Write-Host "How to verify and fix:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Check your API Key in Oracle Cloud" -ForegroundColor White
Write-Host "  - Go to Oracle Cloud Console" -ForegroundColor Gray
Write-Host "  - Click Profile icon (top right)" -ForegroundColor Gray
Write-Host "  - Select 'My Profile'" -ForegroundColor Gray
Write-Host "  - Click 'API Keys' in the left sidebar" -ForegroundColor Gray
Write-Host "  - You should see your API Key with a FINGERPRINT" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Verify Fingerprint matches" -ForegroundColor White
Write-Host "  - Copy the FINGERPRINT from Oracle Cloud" -ForegroundColor Gray
Write-Host "  - Compare with: 97:51:15:1e:53:16:9c:3d:e7:0b:45:3b:c2:a4:80:c3" -ForegroundColor Gray
Write-Host "  - If they don't match, you need to generate a NEW API key pair" -ForegroundColor Red
Write-Host ""

Write-Host "Step 3: If Fingerprint doesn't match, regenerate" -ForegroundColor White
Write-Host "  1. In Oracle Cloud, delete the old API Key" -ForegroundColor Gray
Write-Host "  2. Click 'Generate API Key Pair'" -ForegroundColor Gray
Write-Host "  3. Download the private key (oci_api_key.pem)" -ForegroundColor Gray
Write-Host "  4. Copy it to: $env:USERPROFILE\.oci\oci_api_key.pem" -ForegroundColor Gray
Write-Host "  5. Copy the NEW FINGERPRINT exactly as shown in Oracle Cloud" -ForegroundColor Gray
Write-Host "  6. Update terraform.tfvars with the new fingerprint" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 4: Verify User OCID" -ForegroundColor White
Write-Host "  - Go back to 'My Profile' in Oracle Cloud" -ForegroundColor Gray
Write-Host "  - Look for 'OCID' field near the top" -ForegroundColor Gray
Write-Host "  - It should start with 'ocid1.user'" -ForegroundColor Gray
Write-Host "  - Current value: ocid1.user.oc1..aaaaaaaanmjd56qn2mmzdqmoqgikatexvdjkplt3ah5v4l567mszvpixjfiq" -ForegroundColor Gray
Write-Host ""

Write-Host "Once you've verified/updated the credentials:" -ForegroundColor Green
Write-Host "  1. Edit infra/terraform.tfvars" -ForegroundColor Green
Write-Host "  2. Update FINGERPRINT and USER OCID if needed" -ForegroundColor Green
Write-Host "  3. Run: cd infra && terraform apply -auto-approve" -ForegroundColor Green
Write-Host ""
