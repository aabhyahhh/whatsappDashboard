GET /api/admin/users: Lists all admin users (excluding passwords). Requires super_admin role.
POST /api/admin/users: Creates a new admin user. Requires super_admin role.
PUT /api/admin/users/:id: Updates an existing admin user. Requires super_admin role. Includes logic to prevent a super\admin from changing their own role.
DELETE /api/admin/users/:id: Deletes an admin user. Requires super_admin role. Includes logic to prevent a super\admin from deleting themselves.
To test these new APIs, you'll need:
Your backend server running:
Make sure your .env file has MONGODB_URI and JWT_SECRET configured correctly.
Start the backend: npm run auth-server (if it's not already running in the background from our last interaction).
Confirm you see "Auth server running at http://localhost:5000" and "MongoDB connected successfully" in your terminal.
A tool to make API requests: You can use Postman, Insomnia, or even curl in your terminal.
Testing Steps:
A. Log in to get a JWT Token (if you don't have one):
Method: POST
URL: http://localhost:5000/api/auth
Body (JSON):
Apply to Login.tsx
Expected Response: A JSON object containing a token. Copy this token; you'll need it for subsequent requests.
B. List Admin Users:
Method: GET
URL: http://localhost:5000/api/admin/users
Headers:
Authorization: Bearer YOUR_JWT_TOKEN_HERE (Replace YOUR_JWT_TOKEN_HERE with the token you got from step A)
Expected Response: An array of admin user objects (you should see the initial admin user).
C. Create a New Admin User:
Method: POST
URL: http://localhost:5000/api/admin/users
Headers:
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (JSON):
Apply to Login.tsx
Expected Response: A success message and the details of the new admin user.
D. Update an Admin User (Optional):
Method: PUT
URL: http://localhost:5000/api/admin/users/:id (Replace :id with the _id of the user you want to update, e.g., from the List Admin Users response)
Headers:
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Body (JSON): (Example: update username and email)
Apply to Login.tsx
Expected Response: A success message and the updated admin user details.
E. Delete an Admin User (Optional):
Method: DELETE
URL: http://localhost:5000/api/admin/users/:id (Replace :id with the _id of the user you want to delete. Be careful not to delete your own super\admin account!)
Headers:
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Expected Response: A success message.