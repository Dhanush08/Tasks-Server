### 1. API Design

**Objective:** Define RESTful API endpoints for CRUD operations on tasks.

**Steps:**

- **Identified Key Actions:** Determined the CRUD operations needed: Create, Read, Update, Delete for tasks.
- **Defined Routes:**
    - POST `/users` - Registers a new user
    - POST `/login` - Generates a jwt for a valid user  
    - POST `/tasks` - Creates a new task 
    - GET `/tasks` - Retrieves all tasks
    - GET `/tasks/:id` - Retrieves a specific task by ID
    - PUT `/tasks/:id` - Updates a specific task by ID
    - DELETE `/tasks/:id` - Deletes a specific task by ID
- **Specified JSON Body and Responses:** Detailed the JSON format for requests (what to send) and responses (what to expect back).
- **Document Authentication Requirements:** All endpoints require user authentication.


### 2. Database Schema

**Objective:** Design a database schema for task management.

**Steps:**

- **Defined Tables:**
    - `Tasks` table with columns: `id` (primary key), `title`, `description`, `status`, `assignee_id`, `created_at`, `updated_at`.
    - `Users` table for handling authentication with columns: `id`, `username`, `password_hash`.
- **Relationships:** Link `Users` to `Tasks` through `assignee_id` to show which user is responsible for a task.


### 3. Backend Logic

**Objective:** Implement business logic for task management.

**Steps:**

- **Set Up Node.js Project:** Initialized a Node.js project with `npm init`.
- **Install Dependencies:** Used `npm install module-name`.
- **Implemented Endpoints:** Used Express.js to setup routes that correspond to my API design.
    - For each route, connected their respective SQLite database and executed the appropriate SQL query.
- **Error Handling:** Ensured that the API handles errors gracefully and returns appropriate error messages.


### 4. Authentication and Authorization

**Objective:** Secure the API using authentication.

**Steps:**

- **Implemented User Authentication:** Use JSON Web Tokens (JWT) for authentication.
    - Install JWT library: `npm install jsonwebtoken`.
    - Created login and register endpoints that handle token creation and user authentication.
- **User Access Control:** Implemented middleware functionality that checks if the user is authenticated.
