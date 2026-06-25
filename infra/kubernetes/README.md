# GovSphere — Kubernetes

Kubernetes manifests for production deployment.

## Planned Structure

```
kubernetes/
├── namespaces/
├── deployments/
│   ├── web.yaml
│   ├── api.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   └── minio.yaml
├── services/
├── ingress/
├── configmaps/
├── secrets/         (sealed-secrets — no plaintext secrets in Git)
└── hpa/             Horizontal Pod Autoscaler
```

## Status: Not yet started — infrastructure phase.
