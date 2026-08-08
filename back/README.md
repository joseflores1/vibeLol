# Backend Guide

Express + TypeScript + Prisma backend using a layered (MVC-style) architecture.

The goal of this guide is not to memorize a specific example, but to understand
**what each layer is responsible for** so you can build any new feature on your
own. Once you know where each kind of code belongs, adding a feature is just a
matter of filling in the layers.

## The core idea: one job per layer

A single feature is split across a few small files. Each file answers exactly
one question:

- **What is valid input?** -> the validator
- **What should actually happen?** -> the service
- **How is it exposed over HTTP?** -> the controller and the route

Keeping these separate means business logic never gets tangled with HTTP
details, validation lives in one place, and any developer can read a feature by
following the same path every time.

## Request flow

```
Request -> Route -> Controller -> Service -> Prisma (model) -> Database
                                     |
                                  Response <- Controller <- Service
```

A request enters through a **route**, which hands it to a **controller**. The
controller validates the input and calls a **service**. The service runs the
logic and talks to the database through **Prisma**, then returns data back up
the chain. If anything goes wrong, an error is thrown and handled centrally.

## The layers in detail

### Route (`src/routes/`)

**Job:** connect a URL + HTTP method to a controller handler.

Routes are just a wiring table. They contain no logic, no validation, and no
database access. If a route file has an `if` statement or a Prisma call,
something is in the wrong place.

### Controller (`src/controllers/`)

**Job:** translate between the HTTP world and your application.

A controller reads input from the request, validates it, calls a service, and
shapes the response (status code + body). That is all.

- Belongs here: reading `req.body` / `req.params`, calling a validator, calling
  a service, choosing the HTTP status code.
- Does **not** belong here: business rules or database queries. If you are
  writing a Prisma query in a controller, move it to a service.

Controllers should stay thin. They are a translation layer, not where your app
"thinks".

### Service (`src/services/`)

**Job:** the actual feature logic. This is where your application's behavior
lives.

- Belongs here: business rules, database access via Prisma, coordinating
  multiple steps, throwing `ApiError` for expected failures (not found,
  conflict, forbidden, etc.).
- Does **not** belong here: anything about HTTP. A service should never touch
  `req`, `res`, or status codes. It should not know whether it was called from a
  web request, a script, or a test.

This separation is what makes your logic reusable and testable. You can call a
service from anywhere.

### Validator (`src/validators/`)

**Job:** define what valid input looks like, using Zod, and derive the matching
TypeScript types.

- Belongs here: Zod schemas for request bodies and route params, plus the types
  inferred from them with `z.infer`.
- Does **not** belong here: business rules. A validator checks *shape and
  format* ("is this a string?", "is this a valid email?"). A rule like "this
  email must be unique" depends on the database, so it lives in a service.

Defining input once as a schema gives you both runtime validation and a static
type, so the two can never drift apart.

### Model (`prisma/schema.prisma`)

With Prisma, your data model is the schema file. Each `model` becomes a table
and a typed client you use inside services.

## How to build a new feature

For any new entity or feature, create the same set of files. Below, replace
`Item` / `item` with your own name.

### 1. Model — define the data

Add a `model` to `prisma/schema.prisma`, then run the migration:

```bash
npx prisma migrate dev
```

### 2. Validator — `src/validators/item.validator.ts`

Describe valid input and infer the types from it.

```ts
import { z } from "zod";

// Define the fields and their rules for each operation.
export const createItemSchema = z.object({
  // field: z.string().min(1),
});

export const updateItemSchema = z.object({
  // same fields, but each .optional() for partial updates
});

export const itemIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
```

### 3. Service — `src/services/item.service.ts`

Write the logic and database access. Throw `ApiError` for expected failures.

```ts
import { prisma } from "../lib/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import type {
  CreateItemInput,
  UpdateItemInput,
} from "../validators/item.validator.js";

export const itemService = {
  async findById(id: string) {
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item) {
      throw ApiError.notFound(`Item ${id} not found`);
    }
    return item;
  },

  async create(data: CreateItemInput) {
    // Apply any business rules here (uniqueness checks, etc.),
    // then write to the database.
    return prisma.item.create({ data });
  },

  // findAll, update, remove follow the same pattern.
};
```

### 4. Controller — `src/controllers/item.controller.ts`

Validate, call the service, respond. No business logic.

```ts
import type { Request, Response } from "express";
import { itemService } from "../services/item.service.js";
import {
  createItemSchema,
  itemIdParamSchema,
} from "../validators/item.validator.js";

export const itemController = {
  async getById(req: Request, res: Response) {
    const { id } = itemIdParamSchema.parse(req.params);
    const item = await itemService.findById(id);
    res.json({ success: true, data: item });
  },

  async create(req: Request, res: Response) {
    const data = createItemSchema.parse(req.body);
    const item = await itemService.create(data);
    res.status(201).json({ success: true, data: item });
  },

  // list, update, remove follow the same pattern.
};
```

### 5. Route — `src/routes/item.routes.ts`

```ts
import { Router } from "express";
import { itemController } from "../controllers/item.controller.js";

const router = Router();

router.get("/:id", itemController.getById);
router.post("/", itemController.create);
// add the rest of the handlers

export { router as itemRoutes };
```

### 6. Register — `src/routes/index.ts`

Add one line to mount the module under its prefix:

```ts
import { itemRoutes } from "./item.routes.js";

router.use("/items", itemRoutes); // available at /api/items
```

## Where does my code go?

When you are unsure where a piece of code belongs, use this:

| I need to...                                   | Put it in...                         |
| ---------------------------------------------- | ------------------------------------ |
| Check the request body has the right shape     | Validator (Zod schema)               |
| Read `req.body` or `req.params`                | Controller                           |
| Decide the HTTP status code                    | Controller                           |
| Enforce a business rule (uniqueness, limits)   | Service                              |
| Read from or write to the database             | Service                              |
| Return an expected error to the client         | `throw ApiError.*()` in a service    |
| Reject malformed input                         | `schema.parse()` in a controller     |
| Add a new URL                                  | Route                               |
| Share an environment variable                  | `config/env.ts`                      |
| Share a helper across features                 | `utils/`                            |

## Response contract

Every endpoint returns the same shape so the frontend can rely on it.

Success:

```json
{ "success": true, "data": {} }
```

Error:

```json
{ "success": false, "message": "Reason", "errors": [] }
```

`errors` only appears on validation failures and lists the fields that failed.

## Error handling

Do **not** write `try/catch` in routes or controllers. Throw the error and let
the central handler format the response.

```ts
throw ApiError.notFound("Not found");   // -> 404
throw ApiError.conflict("Already exists"); // -> 409
throw ApiError.badRequest("Invalid");   // -> 400
```

- Expected failures: throw an `ApiError` from the service.
- Invalid input: a failed `schema.parse()` throws automatically -> `400` with
  field details.
- Unexpected bugs: anything else is logged and returned as a generic `500`.

## Conventions

- **Imports:** relative imports end in `.js` (ESM / NodeNext), even for `.ts`
  files. Type-only imports use `import type { ... }`.
- **Never trust input:** always validate `req.body` and `req.params` with a Zod
  schema before using them.
- **Thin controllers:** controllers only validate, call a service, and respond.
- **Logic in services:** all business rules and database access live in services.
- **One file per layer, per entity:** `<entity>.validator.ts`,
  `<entity>.service.ts`, `<entity>.controller.ts`, `<entity>.routes.ts`.

## Running locally

```bash
npm install              # install dependencies
npx prisma migrate dev   # apply database migrations
npm run dev              # start the dev server with hot reload
```

Health check: `GET /api/health` returns the server and database status.
