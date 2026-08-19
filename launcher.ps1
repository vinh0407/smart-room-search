# Smart Room Launcher UI
$ErrorActionPreference = 'Continue'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Root  = $PSScriptRoot
$BE    = Join-Path $Root 'Smart Room Search Website-BE'
$FE    = Join-Path $Root 'Smart Room Search Website-FE'
$Admin = Join-Path $Root 'Admin'
$WorkerUrl = 'https://smart-room-api.smart-room-backend.workers.dev/health'
$BePidFile = Join-Path $env:TEMP 'smartroom_be.pid'
$Jobs = @{}

function Log([string]$msg) {
    $line = "[{0}] {1}" -f (Get-Date -Format 'HH:mm:ss'), $msg
    $txtLog.AppendText($line + [Environment]::NewLine)
}

function Port-Pid([int]$Port) {
    try {
        $c = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
        if ($c) { return ($c | Select-Object -First 1).OwningProcess }
    } catch {}
    return $null
}

function Port-Active([int]$Port) { return ($null -ne (Port-Pid $Port)) }

function Set-Status($label, [bool]$on) {
    $label.Text = if ($on) { 'ON' } else { 'OFF' }
    $label.ForeColor = if ($on) { [System.Drawing.Color]::FromArgb(22, 163, 74) } else { [System.Drawing.Color]::FromArgb(220, 38, 38) }
}

function Start-BE {
    if (Port-Active 4000) { Log 'BE local da chay (port 4000). Bo qua.'; return }
    try {
        $p = Start-Process -FilePath 'node' -ArgumentList 'src/server.js' -WorkingDirectory $BE -WindowStyle Hidden -PassThru
        $p.Id | Set-Content -Path $BePidFile
        Log ("BE local dang khoi dong (PID {0})..." -f $p.Id)
    } catch {
        Log "Khong the khoi dong BE: $($_.Exception.Message)"
    }
}

function Stop-BE {
    if (Test-Path $BePidFile) {
        $pid_ = Get-Content $BePidFile | Select-Object -First 1
        try { Stop-Process -Id $pid_ -Force -ErrorAction Stop; Log "BE local da dung (PID $pid_)." }
        catch { Log "Khong stop duoc PID $pid_ (co the da dung)." }
        Remove-Item $BePidFile -ErrorAction SilentlyContinue
    } else {
        $p = Port-Pid 4000
        if ($p) { Stop-Process -Id $p -Force; Log "BE local da dung (PID $p, tu port 4000)." }
        else { Log 'BE local khong chay.' }
    }
}

function Refresh-Status {
    Set-Status $lblBE    (Port-Active 4000)
    Set-Status $lblAdmin (Port-Active 5173)
}

function Invoke-Async([string]$Name, [scriptblock]$Body, $Arg = $null) {
    if ($null -eq $Arg) {
        $j = Start-Job -ScriptBlock $Body
    } else {
        $j = Start-Job -ArgumentList $Arg -ScriptBlock $Body
    }
    $Jobs[$j.Id] = $Name
    Log "Bat dau: $Name"
}

function Test-Health([string]$Url, [string]$Name) {
    Invoke-Async ("Kiem tra health " + $Name) {
        param($u)
        try {
            $r = Invoke-WebRequest -Uri $u -TimeoutSec 8 -UseBasicParsing
            "HTTP $($r.StatusCode) - $($r.Content)"
        } catch {
            if ($_.Exception.Response) {
                "HTTP $([int]$_.Exception.Response.StatusCode) - LOI: $($_.Exception.Message)"
            } else {
                "LOI: $($_.Exception.Message)"
            }
        }
    } $Url
}

# ── Form ──
$form = New-Object System.Windows.Forms.Form
$form.Text = 'Smart Room Search - Launcher'
$form.Size = New-Object System.Drawing.Size(660, 620)
$form.StartPosition = 'CenterScreen'
$form.MinimumSize = $form.Size
$form.Font = New-Object System.Drawing.Font('Segoe UI', 9.5)

$lblTitle = New-Object System.Windows.Forms.Label
$lblTitle.Text = 'Smart Room Search - Quan ly Backend & Database'
$lblTitle.Font = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
$lblTitle.Location = New-Object System.Drawing.Point(12, 10)
$lblTitle.AutoSize = $true
$form.Controls.Add($lblTitle)

# Status
$grpStatus = New-Object System.Windows.Forms.GroupBox
$grpStatus.Text = 'Trang thai'
$grpStatus.Location = New-Object System.Drawing.Point(12, 45)
$grpStatus.Size = New-Object System.Drawing.Size(620, 68)
$form.Controls.Add($grpStatus)

$lblBE = $null; $lblAdmin = $null; $lblWorker = $null

function Add-StatusPair($parent, [string]$name, [int]$x, [ref]$labelRef) {
    $l1 = New-Object System.Windows.Forms.Label
    $l1.Text = $name
    $l1.Location = New-Object System.Drawing.Point($x, 22)
    $l1.AutoSize = $true
    $parent.Controls.Add($l1)
    $l2 = New-Object System.Windows.Forms.Label
    $l2.Text = '...'
    $l2.Font = New-Object System.Drawing.Font('Segoe UI', 10, [System.Drawing.FontStyle]::Bold)
    $l2.Location = New-Object System.Drawing.Point(($x + 80), 22)
    $l2.AutoSize = $true
    $parent.Controls.Add($l2)
    $labelRef.Value = $l2
}

Add-StatusPair $grpStatus 'BE local (4000):' 15 ([ref]$lblBE)
Add-StatusPair $grpStatus 'FE/Admin (5173):' 180 ([ref]$lblAdmin)
Add-StatusPair $grpStatus 'Worker online:' 360 ([ref]$lblWorker)

$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Text = 'Refresh'
$btnRefresh.Location = New-Object System.Drawing.Point(535, 22)
$btnRefresh.Size = New-Object System.Drawing.Size(72, 26)
$btnRefresh.Add_Click({ Refresh-Status; Check-Worker })
$grpStatus.Controls.Add($btnRefresh)

# Backend
$grpBE = New-Object System.Windows.Forms.GroupBox
$grpBE.Text = 'Backend local (Node.js - port 4000)'
$grpBE.Location = New-Object System.Drawing.Point(12, 122)
$grpBE.Size = New-Object System.Drawing.Size(620, 60)
$form.Controls.Add($grpBE)

$btnStartBE = New-Object System.Windows.Forms.Button
$btnStartBE.Text = 'Start BE'
$btnStartBE.Location = New-Object System.Drawing.Point(15, 22)
$btnStartBE.Size = New-Object System.Drawing.Size(110, 28)
$btnStartBE.Add_Click({ Start-BE })
$grpBE.Controls.Add($btnStartBE)

$btnStopBE = New-Object System.Windows.Forms.Button
$btnStopBE.Text = 'Stop BE'
$btnStopBE.Location = New-Object System.Drawing.Point(135, 22)
$btnStopBE.Size = New-Object System.Drawing.Size(110, 28)
$btnStopBE.Add_Click({ Stop-BE; Refresh-Status })
$grpBE.Controls.Add($btnStopBE)

$btnHealthBE = New-Object System.Windows.Forms.Button
$btnHealthBE.Text = 'Kiem tra health'
$btnHealthBE.Location = New-Object System.Drawing.Point(255, 22)
$btnHealthBE.Size = New-Object System.Drawing.Size(130, 28)
$btnHealthBE.Add_Click({ Test-Health 'http://localhost:4000/health' 'BE local' })
$grpBE.Controls.Add($btnHealthBE)

$btnOpenBE = New-Object System.Windows.Forms.Button
$btnOpenBE.Text = 'Mo http://localhost:4000/health'
$btnOpenBE.Location = New-Object System.Drawing.Point(395, 22)
$btnOpenBE.Size = New-Object System.Drawing.Size(210, 28)
$btnOpenBE.Add_Click({ Start-Process 'http://localhost:4000/health' })
$grpBE.Controls.Add($btnOpenBE)

# Online
$grpOnline = New-Object System.Windows.Forms.GroupBox
$grpOnline.Text = 'Worker online (Cloudflare - smart-room-api)'
$grpOnline.Location = New-Object System.Drawing.Point(12, 190)
$grpOnline.Size = New-Object System.Drawing.Size(620, 60)
$form.Controls.Add($grpOnline)

$btnDeploy = New-Object System.Windows.Forms.Button
$btnDeploy.Text = 'Deploy worker'
$btnDeploy.Location = New-Object System.Drawing.Point(15, 22)
$btnDeploy.Size = New-Object System.Drawing.Size(130, 28)
$btnDeploy.Add_Click({
    Invoke-Async 'Deploy worker' {
        param($be)
        Set-Location $be
        npx wrangler deploy 2>&1 | Out-String
    } $BE
})
$grpOnline.Controls.Add($btnDeploy)

$btnHealthOnline = New-Object System.Windows.Forms.Button
$btnHealthOnline.Text = 'Kiem tra health online'
$btnHealthOnline.Location = New-Object System.Drawing.Point(155, 22)
$btnHealthOnline.Size = New-Object System.Drawing.Size(160, 28)
$btnHealthOnline.Add_Click({ Test-Health $WorkerUrl 'worker online' })
$grpOnline.Controls.Add($btnHealthOnline)

# Apps
$grpApps = New-Object System.Windows.Forms.GroupBox
$grpApps.Text = 'Ung dung (dev)'
$grpApps.Location = New-Object System.Drawing.Point(12, 258)
$grpApps.Size = New-Object System.Drawing.Size(620, 60)
$form.Controls.Add($grpApps)

$btnAdmin = New-Object System.Windows.Forms.Button
$btnAdmin.Text = 'Start Admin dev'
$btnAdmin.Location = New-Object System.Drawing.Point(15, 22)
$btnAdmin.Size = New-Object System.Drawing.Size(130, 28)
$btnAdmin.Add_Click({
    if (Port-Active 5173) { Log 'Admin da chay (port 5173).'; return }
    Start-Process -FilePath 'cmd' -ArgumentList '/k', 'npm run dev' -WorkingDirectory $Admin -WindowStyle Hidden
    Log 'Admin dev dang khoi dong...'
})
$grpApps.Controls.Add($btnAdmin)

$btnOpenAdmin = New-Object System.Windows.Forms.Button
$btnOpenAdmin.Text = 'Mo Admin'
$btnOpenAdmin.Location = New-Object System.Drawing.Point(155, 22)
$btnOpenAdmin.Size = New-Object System.Drawing.Size(100, 28)
$btnOpenAdmin.Add_Click({ Start-Process 'http://localhost:5173' })
$grpApps.Controls.Add($btnOpenAdmin)

$btnFE = New-Object System.Windows.Forms.Button
$btnFE.Text = 'Start FE dev'
$btnFE.Location = New-Object System.Drawing.Point(265, 22)
$btnFE.Size = New-Object System.Drawing.Size(130, 28)
$btnFE.Add_Click({
    if (Port-Active 5173) { Log 'Port 5173 da co ung dung chay (Admin hoac FE). Tam dung no truoc.'; return }
    Start-Process -FilePath 'cmd' -ArgumentList '/k', 'npm run dev' -WorkingDirectory $FE -WindowStyle Hidden
    Log 'FE dev dang khoi dong...'
})
$grpApps.Controls.Add($btnFE)

$btnOpenFE = New-Object System.Windows.Forms.Button
$btnOpenFE.Text = 'Mo FE'
$btnOpenFE.Location = New-Object System.Drawing.Point(405, 22)
$btnOpenFE.Size = New-Object System.Drawing.Size(100, 28)
$btnOpenFE.Add_Click({ Start-Process 'http://localhost:5173' })
$grpApps.Controls.Add($btnOpenFE)

# Database
$grpDB = New-Object System.Windows.Forms.GroupBox
$grpDB.Text = 'Database (TiDB)'
$grpDB.Location = New-Object System.Drawing.Point(12, 326)
$grpDB.Size = New-Object System.Drawing.Size(620, 60)
$form.Controls.Add($grpDB)

$btnMigrate = New-Object System.Windows.Forms.Button
$btnMigrate.Text = 'Cap nhat DB (schema + seed)'
$btnMigrate.Location = New-Object System.Drawing.Point(15, 22)
$btnMigrate.Size = New-Object System.Drawing.Size(210, 28)
$btnMigrate.Add_Click({
    Invoke-Async 'Cap nhat DB' {
        param($be)
        Set-Location $be
        node scripts/migrate-to-mysql.js 2>&1 | Out-String
    } $BE
})
$grpDB.Controls.Add($btnMigrate)

$btnDoc = New-Object System.Windows.Forms.Button
$btnDoc.Text = 'Mo TIDB-DATA-SERVICE-SETUP.md'
$btnDoc.Location = New-Object System.Drawing.Point(235, 22)
$btnDoc.Size = New-Object System.Drawing.Size(200, 28)
$btnDoc.Add_Click({ Start-Process (Join-Path $Root 'TIDB-DATA-SERVICE-SETUP.md') })
$grpDB.Controls.Add($btnDoc)

# Log
$txtLog = New-Object System.Windows.Forms.TextBox
$txtLog.Multiline = $true
$txtLog.ReadOnly = $true
$txtLog.ScrollBars = 'Vertical'
$txtLog.WordWrap = $false
$txtLog.Location = New-Object System.Drawing.Point(12, 394)
$txtLog.Size = New-Object System.Drawing.Size(620, 170)
$txtLog.Font = New-Object System.Drawing.Font('Consolas', 9)
$form.Controls.Add($txtLog)

# Timers
$timerStatus = New-Object System.Windows.Forms.Timer
$timerStatus.Interval = 5000
$timerStatus.Add_Tick({ Refresh-Status })
$timerStatus.Start()

$timerJobs = New-Object System.Windows.Forms.Timer
$timerJobs.Interval = 800
$timerJobs.Add_Tick({
    if ($Jobs.Count -eq 0) { return }
    $done = @()
    foreach ($id in $Jobs.Keys) {
        $j = Get-Job -Id $id -ErrorAction SilentlyContinue
        if (-not $j) { $done += $id; continue }
        if ($j.State -eq 'Completed' -or $j.State -eq 'Failed' -or $j.State -eq 'Stopped') {
            $out = Receive-Job -Job $j
            if ($out) { foreach ($line in $out) { Log ([string]$line) } }
            if ($j.State -ne 'Completed') { Log "Ket thuc: $($Jobs[$id]) (trang thai: $($j.State))" }
            Remove-Job -Job $j -Force
            $done += $id
        }
    }
    foreach ($id in $done) { $Jobs.Remove($id) }
})
$timerJobs.Start()

function Check-Worker {
    Set-Status $lblWorker $false
    Invoke-Async 'Kiem tra health worker online' {
        param($u)
        try {
            $r = Invoke-WebRequest -Uri $u -TimeoutSec 8 -UseBasicParsing
            "HTTP $($r.StatusCode) - $($r.Content)"
        } catch {
            if ($_.Exception.Response) {
                "HTTP $([int]$_.Exception.Response.StatusCode) - LOI: $($_.Exception.Message)"
            } else {
                "LOI: $($_.Exception.Message)"
            }
        }
    } $WorkerUrl
}

$form.Add_FormClosed({
    foreach ($id in $Jobs.Keys) { Stop-Job -Id $id -ErrorAction SilentlyContinue; Remove-Job -Id $id -Force -ErrorAction SilentlyContinue }
    $timerStatus.Stop(); $timerJobs.Stop()
})

Log 'Smart Room Launcher san sang.'
Log ('Root: ' + $Root)
Refresh-Status
Check-Worker

$form.ShowDialog() | Out-Null
