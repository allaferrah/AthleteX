<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Sport Categories Feature
- Admin manages sports via Admin Dashboard > Sports tab (CRUD)
- 10 default Algerian sports seeded via `backend/prisma/seed.js`
- `SportCategory` model in Prisma: name, nameAr, icon, description, descriptionAr, sortOrder
- `Service` model has optional `sportId` relation to `SportCategory`
- Backend endpoint: `GET /sport-categories` (public), `POST/PUT/DELETE` (admin only)
- `serviceAPI.getAll(category?, sportId?)` filters by sportId
- `sportCategoryAPI` in `api.ts`: getAll, getById, create, update, delete
- Sports marketplace `/marketplace/sports` shows category cards → click → `/marketplace/sports/[sportId]`
- Expert "My Services" shows a sport grid when SPORTS category is selected
- Creating a SPORTS service requires selecting a sport type from the admin-managed list
