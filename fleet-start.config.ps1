# Per-repo fleet start config for teleconference-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'teleconference-mcp'
    BackendPort  = 10887
    FrontendPort = 10886
    HealthPath   = '/health'
    WebRoot      = '.'
    Backend = @{
        Kind       = 'module-serve'
        Module     = 'teleconference_mcp'
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
