# Run from the fork's checkout, or pass -Repo with its path.
[CmdletBinding()]
param(
    [string]$Repo = '.',
    [switch]$CheckOnly,
    [uri]$Proxy
)

$ErrorActionPreference = 'Stop'
function Invoke-Git {
    $result = & git @args
    if ($LASTEXITCODE -ne 0) { throw "Git failed: git $args" }
    $result
}

Push-Location -LiteralPath $Repo
try {
    $top = Invoke-Git rev-parse --show-toplevel
    Set-Location -LiteralPath $top
    foreach ($state in 'CHERRY_PICK_HEAD','MERGE_HEAD','REVERT_HEAD','sequencer','rebase-merge','rebase-apply') {
        if (Test-Path -LiteralPath (Invoke-Git rev-parse --git-path $state)) {
            throw 'A Git operation is in progress. Finish or abort it first.'
        }
    }

    $branch = Invoke-Git branch --show-current
    $prefix = 'feature/download-speed-test-'
    if ($branch -notmatch '^feature/download-speed-test-(v\d+\.\d+\.\d+)$') {
        throw "Check out the custom release branch first (for example, ${prefix}v2.5.10)."
    }
    $base = $Matches[1]
    Invoke-Git merge-base --is-ancestor "refs/tags/$base" HEAD
    $official = 'clash-verge-rev/clash-verge-rev'
    $url = Invoke-Git remote get-url upstream
    if ($url -notmatch '^((https://|ssh://git@)github\.com/|git@github\.com:)clash-verge-rev/clash-verge-rev(\.git)?/?$') {
        throw "Expected upstream to point to the official repository. Found: $url"
    }
    $request = @{
        Uri = "https://api.github.com/repos/$official/releases/latest"
        Headers = @{ Accept = 'application/vnd.github+json' }
        UserAgent = 'Clash-Verge-Fork-Sync'
        TimeoutSec = 30
    }
    if ($Proxy) { $request.Proxy = $Proxy }
    $release = Invoke-RestMethod @request
    $tag = [string]$release.tag_name
    if ($release.draft -or $release.prerelease -or $tag -notmatch '^v\d+\.\d+\.\d+$') {
        throw "Unexpected official release: $tag"
    }
    $range = "refs/tags/$base..HEAD"
    $commits = @(Invoke-Git rev-list --reverse --topo-order $range)
    Write-Host "$branch -> $tag ($($commits.Count) custom commits)"
    if ($base -eq $tag) { Write-Host 'Already on the latest official release.'; return }
    if ([version]$tag.Substring(1) -lt [version]$base.Substring(1)) { throw "Refusing downgrade from $base to $tag." }
    if ($CheckOnly) { return }
    if (Invoke-Git status --porcelain) { throw 'Commit or stash working tree changes before syncing.' }
    if (Invoke-Git rev-list --merges $range) { throw 'The custom range contains merge commits. Review the range before migrating.' }
    $target = "$prefix$tag"
    if (Invoke-Git branch --list $target) { throw "Branch $target already exists. Inspect it before continuing." }

    $fetchOptions = @()
    if ($Proxy) { $fetchOptions = @('-c', "http.proxy=$($Proxy.AbsoluteUri)") }
    Invoke-Git @fetchOptions fetch --no-tags upstream "refs/tags/${tag}:refs/tags/${tag}"
    $identity = @()
    if ($commits.Count) {
        $configuredName = git config --get user.name
        $configuredEmail = git config --get user.email
        if (!$configuredName -or !$configuredEmail) {
            $identity = @('-c','user.name=shooker2012','-c','user.email=shooker2012@users.noreply.github.com')
            Write-Host 'Using the fork owner noreply identity for this cherry-pick.'
        }
    }
    Invoke-Git switch -c $target "refs/tags/$tag"
    if ($commits.Count) {
        & git @identity cherry-pick @commits
        if ($LASTEXITCODE -ne 0) {
            $gitCommand = "git $($identity -join ' ')".TrimEnd()
            throw "Migration stopped on $target. Run git status. For conflicts, resolve and git add the files, then run: $gitCommand cherry-pick --continue. To cancel the sequence: git cherry-pick --abort. Original branch: $branch"
        }
    }
    Write-Host "Ready on $target. Review and test before pushing to origin."
}
finally { Pop-Location }
