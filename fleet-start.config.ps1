# Per-repo fleet start config for teleconference-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'teleconference-mcp'
    BackendPort  = 10887
    FrontendPort = 10886
    HealthPath   = '/health'
    WebRoot      = 'apps\web'
    Backend = @{
        Kind       = 'module-serve'
        Module     = 'teleconference_mcp'
    }
    Frontend = @{
        Kind           = 'next'
        PackageManager = 'npm'
        ApiTargetEnv   = 'BACKEND_URL'
    }
}
