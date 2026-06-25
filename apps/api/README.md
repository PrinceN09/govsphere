# @govsphere/api

NestJS backend API — REST + WebSocket for GovSphere.

## Stack

- NestJS 10
- TypeScript
- Prisma ORM (PostgreSQL)
- Socket.IO (real-time messaging)
- JWT authentication
- BullMQ (background jobs, Redis)
- MinIO SDK (file storage)
- Swagger (API documentation)

## Dev

```bash
cd apps/api
npm run dev    # http://localhost:4000
# Swagger: http://localhost:4000/api/docs
```

## Module Structure (to be built)

```
src/
├── app.module.ts
├── main.ts
├── modules/
│   ├── auth/         JWT auth, login, MFA
│   ├── users/        User management
│   ├── ministries/   Ministry management
│   ├── departments/  Department management
│   ├── channels/     Channel management
│   ├── messages/     Messaging
│   ├── files/        File upload/download (MinIO)
│   ├── notifications/ Push notifications
│   └── audit/        Audit log recording
├── common/
│   ├── guards/       Auth, RBAC guards
│   ├── decorators/   Custom decorators
│   ├── filters/      Exception filters
│   ├── pipes/        Validation pipes
│   └── interceptors/ Logging, transform
└── gateways/
    └── messaging.gateway.ts   Socket.IO gateway
```
