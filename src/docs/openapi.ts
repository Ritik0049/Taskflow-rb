export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "TaskFlow API",
    version: "1.0.0",
    description:
      "Multi-tenant project management API. All resource endpoints are scoped to the authenticated user's organization; the organization is derived from the JWT and never accepted from the client.",
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          error: { type: "string", example: "Task not found" },
          code: { type: "string", example: "TASK_NOT_FOUND" },
          details: { type: "object" },
        },
      },
      Project: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          orgId: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string", nullable: true },
          deletedAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Task: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          projectId: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string", nullable: true },
          status: { type: "string", enum: ["todo", "in_progress", "review", "done"] },
          priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          dueDate: { type: "string", format: "date-time", nullable: true },
          deletedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      PaginatedResponse: {
        type: "object",
        properties: {
          data: { type: "array", items: {} },
          total: { type: "integer", example: 42 },
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 20 },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user and create their organization",
        description: "Rate limited to 10 requests per minute per IP.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password", "name", "organizationName"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string" },
                  organizationName: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Registered; returns user, accessToken, refreshToken" },
          "409": { description: "Email already registered" },
          "429": { description: "Rate limit exceeded" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Log in",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Returns user, accessToken (15m), refreshToken (7d)" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Exchange a refresh token for a new token pair",
        description: "The presented refresh token is revoked on use (rotation).",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: {
          "200": { description: "New accessToken and refreshToken" },
          "401": { description: "Invalid, expired, or revoked token" },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Revoke a refresh token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["refreshToken"],
                properties: { refreshToken: { type: "string" } },
              },
            },
          },
        },
        responses: { "204": { description: "Revoked" } },
      },
    },
    "/auth/logout-all": {
      post: {
        tags: ["Auth"],
        summary: "Revoke every refresh token for the current user",
        responses: { "204": { description: "All sessions revoked" } },
      },
    },
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List projects in the caller's organization",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20, maximum: 100 } },
        ],
        responses: {
          "200": {
            description: "Paginated projects",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/PaginatedResponse" },
              },
            },
          },
        },
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Get one project",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "The project" },
          "403": {
            description: "Belongs to another organization; no resource data is returned",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
          "404": { description: "Not found or soft-deleted" },
        },
      },
      patch: {
        tags: ["Projects"],
        summary: "Update a project",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Projects"],
        summary: "Soft-delete a project (org_admin only)",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "204": { description: "Deleted" },
          "403": { description: "Requires org_admin role" },
        },
      },
    },
    "/projects/{id}/dashboard": {
      get: {
        tags: ["Projects"],
        summary: "Task counts grouped by status",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "Counts by status plus a total" } },
      },
    },
    "/tasks": {
      get: {
        tags: ["Tasks"],
        summary: "List tasks with filters",
        parameters: [
          { name: "projectId", in: "query", schema: { type: "string", format: "uuid" } },
          {
            name: "status",
            in: "query",
            schema: { type: "string", enum: ["todo", "in_progress", "review", "done"] },
          },
          {
            name: "priority",
            in: "query",
            schema: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          },
          { name: "assigneeId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "dueFrom", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "dueTo", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "Paginated tasks with assignments" } },
      },
      post: {
        tags: ["Tasks"],
        summary: "Create a task",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["projectId", "title"],
                properties: {
                  projectId: { type: "string", format: "uuid" },
                  title: { type: "string" },
                  description: { type: "string" },
                  status: { type: "string", enum: ["todo", "in_progress", "review", "done"] },
                  priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                  dueDate: { type: "string", format: "date-time" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Created" },
          "403": { description: "Project belongs to another organization" },
        },
      },
    },
    "/tasks/{id}": {
      get: {
        tags: ["Tasks"],
        summary: "Get one task",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": { description: "The task with its assignments" },
          "403": { description: "Belongs to another organization" },
          "404": { description: "Not found or soft-deleted" },
        },
      },
      patch: {
        tags: ["Tasks"],
        summary: "Update a task",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Tasks"],
        summary: "Soft-delete a task",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "204": { description: "Deleted" } },
      },
    },
    "/tasks/{id}/assign": {
      post: {
        tags: ["Tasks"],
        summary: "Assign a user to a task",
        description:
          "Persists the assignment and enqueues an email notification job before responding. If enqueueing fails the assignment is rolled back.",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["userId"],
                properties: { userId: { type: "string", format: "uuid" } },
              },
            },
          },
        },
        responses: {
          "201": { description: "Assignment created; response includes jobId" },
          "403": { description: "Assignee is not in the caller's organization" },
          "409": { description: "User already assigned" },
        },
      },
    },
    "/tasks/{id}/assign/{userId}": {
      delete: {
        tags: ["Tasks"],
        summary: "Unassign a user from a task",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "userId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "204": { description: "Unassigned" } },
      },
    },
    "/jobs/{id}": {
      get: {
        tags: ["Jobs"],
        summary: "Get background job status",
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": {
            description:
              "Job id, status (pending | active | completed | failed), attempt counts, and timestamps",
          },
          "404": { description: "Job not found" },
        },
      },
    },
  },
};