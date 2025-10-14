Here’s a short, clear description of what each backend route does in your API 👇

🔐 Auth Routes

POST /api/auth/register → Creates a new user account with email & password.

POST /api/auth/login → Logs in the user and sets a JWT in an httpOnly cookie.

GET /api/auth/me → Returns the current logged-in user's profile.

POST /api/auth/logout → Logs out the user by clearing the cookie.

📝 Request Routes (User/Admin)

POST /api/requests → User submits a new waste collection request (normal or special).

GET /api/requests/my → User views their submitted requests.

GET /api/requests (Admin) → Admin views all incoming requests.

PATCH /api/requests/:id/approve (Admin) → Approves a pending request.

PATCH /api/requests/:id/reject (Admin) → Rejects a request with an optional reason.

PATCH /api/requests/:id/schedule (Admin) → Assigns a date, truck, and collectors to the request.

🛣 Route Management (Admin)

POST /api/routes/generate → Auto-generates optimized routes based on bin fill levels & zone.

GET /api/routes → Lists generated routes (optionally filtered by date).

PATCH /api/routes/:id/approve → Marks a route as approved and ready for dispatch.

🚛 Collector Routes

GET /api/collector/assignments/today → Returns today’s pickup assignments for collectors.

POST /api/collector/scan → Marks a bin as collected when scanned (or manually entered).

POST /api/collector/sync → Syncs multiple collected bins from offline mode.

💳 Payment Routes

GET /api/payments/summary → Shows current month’s bill with possible credit usage.

POST /api/payments/apply-credits → Applies reward credits (up to 30%) to reduce the bill.

POST /api/payments/checkout → Processes the payment (mock success).

GET /api/payments/history → Shows previous payment records for the user.