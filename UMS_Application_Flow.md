# UMS Application Complete Flow Documentation

## Table of Contents
1. [Application Architecture](#application-architecture)
2. [Request Flow Overview](#request-flow-overview)
3. [Authentication Flow](#authentication-flow)
4. [Authorization Flow](#authorization-flow)
5. [CRUD Operations Flow](#crud-operations-flow)
6. [Database Schema Flow](#database-schema-flow)
7. [Error Handling Flow](#error-handling-flow)

---

## Application Architecture

```mermaid
graph TB
    Client[Client Browser] --> Express[Express.js Server]
    Express --> MW[Middleware Layer]
    MW --> Routes[Route Handlers]
    Routes --> Controllers[Controllers]
    Controllers --> Models[Models]
    Models --> DB[(PostgreSQL Database)]
    Controllers --> Views[EJS Templates]
    Views --> Client
```

### File Structure
```
UMS/
├── app.js                 # Main application entry point
├── config/
│   ├── database.js        # Database connection
│   ├── jwt.js            # JWT token utilities  
│   ├── setup.js          # Database table creation
│   └── validation.js     # Joi validation schemas
├── controllers/
│   ├── AuthController.js  # Authentication logic
│   ├── UserController.js  # User CRUD operations
│   ├── RoleController.js  # Role CRUD operations
│   └── DashboardController.js
├── middleware/
│   └── auth.js           # Authentication & authorization
├── models/
│   ├── User.js           # User database operations
│   ├── Role.js           # Role database operations
│   └── Permission.js     # Permission database operations
├── routes/
│   ├── auth.js           # Authentication routes
│   ├── users.js          # User management routes
│   ├── roles.js          # Role management routes
│   └── dashboard.js      # Dashboard routes
└── views/                # EJS templates
```

---

## Request Flow Overview

### 1. Basic Request Flow
```mermaid
sequenceDiagram
    participant C as Client
    participant A as app.js
    participant MW as Middleware
    participant R as Routes
    participant CTRL as Controller
    participant M as Model
    participant DB as Database
    participant V as View

    C->>A: HTTP Request
    A->>MW: Session/Cookie parsing
    MW->>MW: authenticateToken()
    MW->>R: Route matching
    R->>MW: checkPermission()
    MW->>CTRL: Controller function
    CTRL->>M: Model method
    M->>DB: SQL Query
    DB->>M: Query Result
    M->>CTRL: Processed Data
    CTRL->>V: Render template
    V->>C: HTML Response
```

### 2. Express App Initialization Flow
```mermaid
graph TD
    A[app.js starts] --> B[Load environment variables]
    B --> C[Setup middleware stack]
    C --> C1[express.json()]
    C1 --> C2[express.urlencoded()]
    C2 --> C3[express-session]
    C3 --> C4[cookie-parser]
    C4 --> C5[express.static for public files]
    C5 --> D[Setup view engine - EJS]
    D --> E[Mount route handlers]
    E --> E1[authRoutes at /]
    E1 --> E2[dashboardRoutes at /]
    E2 --> E3[userRoutes at /]
    E3 --> E4[roleRoutes at /]
    E4 --> F[Create database tables]
    F --> G[Start server on port 3000]
```

---

## Authentication Flow

### 1. Login Process
```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant S as Server
    participant DB as Database

    U->>B: Enter credentials
    B->>S: POST /login
    S->>S: Validate input (Joi)
    S->>DB: SELECT user by username
    DB->>S: User data
    S->>S: bcrypt.compare(password)
    alt Valid credentials
        S->>S: generateToken(userInfo)
        S->>B: Set httpOnly cookie + session
        B->>B: Redirect to /dashboard
    else Invalid credentials
        S->>B: Render login with error
    end
```

### 2. Authentication Middleware Flow
```mermaid
graph TD
    A[Request arrives] --> B{Token exists?}
    B -->|No| C[Redirect to /login?error=Please login]
    B -->|Yes| D[verifyToken(token)]
    D --> E{Token valid?}
    E -->|No| F[Destroy session + Clear cookie]
    F --> G[Redirect to /login?error=Invalid token]
    E -->|Yes| H[Query database for user + role + permissions]
    H --> I{User exists?}
    I -->|No| J[Destroy session + Clear cookie]
    J --> K[Redirect to /login?error=User not found]
    I -->|Yes| L[Set req.user with permissions array]
    L --> M[Call next() - Continue to route]
```

### 3. JWT Token Structure
```javascript
// Token payload:
{
  userId: 5,
  username: 'john',
  role: 'admin',
  iat: 1640995200,  // Issued at
  exp: 1641081600   // Expires
}
```

---

## Authorization Flow

### 1. Permission Check Middleware
```mermaid
graph TD
    A[checkPermission('edit_user')] --> B[Query database for permission ID]
    B --> C{Permission exists?}
    C -->|No| D[403 Error: Permission not found]
    C -->|Yes| E[Get permissionId from DB result]
    E --> F{req.user.permissions.includes(permissionId)?}
    F -->|No| G[403 Error: Access denied]
    F -->|Yes| H[Call next() - Allow access]
```

### 2. Permission System Architecture
```mermaid
graph LR
    U[Users] -->|has one| R[Role]
    R -->|has many| P[Permissions]
    P1[view_user] --> R1[admin]
    P2[add_user] --> R1
    P3[edit_user] --> R1
    P4[delete_user] --> R1
    P1 --> R2[user]
    R1 --> U1[john]
    R2 --> U2[jane]
```

### 3. Database Permission Storage
```sql
-- permissions table
permissions: id | name | description
1 | view_user | View user details
2 | add_user | Add new user
3 | edit_user | Edit user details
4 | delete_user | Delete user

-- roles table  
roles: id | name | permissions
1 | superadmin | {1,2,3,4,5,6,7}
2 | admin | {1,2,3,4}
3 | user | {1}

-- users table
users: id | username | role_id
1 | superadmin | 1
2 | john | 2
3 | jane | 3
```

---

## CRUD Operations Flow

### 1. User Creation Flow (POST /users)
```mermaid
sequenceDiagram
    participant F as Form
    participant UC as UserController
    participant UV as Validation
    participant UM as UserModel
    participant DB as Database

    F->>UC: POST /users (form data)
    UC->>UV: userValidation.create.validate()
    UV->>UC: {error, value}
    
    alt Validation fails
        UC->>F: Render form with error
    else Validation passes
        UC->>UM: User.getByUsername()
        UM->>DB: SELECT * FROM users WHERE username = ?
        DB->>UM: Result
        UM->>UC: User data or null
        
        alt User exists
            UC->>F: Render form with "Username exists" error
        else User doesn't exist
            UC->>UM: User.create(userData)
            UM->>DB: INSERT INTO users...
            DB->>UM: Success
            UM->>UC: User created
            UC->>F: Redirect to /users?success=User created
        end
    end
```

### 2. User Update Flow (PUT /users/:id)
```mermaid
graph TD
    A[POST /users/5/edit] --> B[UserController.update]
    B --> C[Validate input with Joi]
    C --> D{Validation OK?}
    D -->|No| E[Redirect to /users/5/edit?error=...]
    D -->|Yes| F[Check if user exists]
    F --> G{User exists?}
    G -->|No| H[Render error page]
    G -->|Yes| I[Check permissions & duplicates]
    I --> J{All checks pass?}
    J -->|No| K[Redirect with specific error]
    J -->|Yes| L[User.update in database]
    L --> M[Redirect to /users?success=Updated]
```

### 3. Role Management Flow
```mermaid
graph TD
    A[Role Request] --> B{Action Type?}
    B -->|GET /roles| C[RoleController.index]
    B -->|GET /roles/create| D[RoleController.showCreate]
    B -->|POST /roles| E[RoleController.create]
    B -->|GET /roles/:id/edit| F[RoleController.showEdit]
    B -->|POST /roles/:id/edit| G[RoleController.update]
    B -->|DELETE /roles/:id| H[RoleController.delete]
    
    C --> C1[Get all roles with user counts using Promise.all]
    C1 --> C2[Render roles/index]
    
    D --> D1[Get all permissions]
    D1 --> D2[Render roles/create form]
    
    E --> E1[Validate role data]
    E1 --> E2[Check for duplicate names]
    E2 --> E3[Create role with permissions array]
    E3 --> E4[Redirect to /roles?success=...]
```

---

## Database Schema Flow

### 1. Database Relationships
```mermaid
erDiagram
    users {
        int id PK
        string username UK
        string email UK
        string password
        int role_id FK
        timestamp created_at
        int created_by FK
        timestamp updated_at
        int updated_by FK
    }
    
    roles {
        int id PK
        string name UK
        text description
        int_array permissions
        timestamp created_at
        timestamp updated_at
    }
    
    permissions {
        int id PK
        string name UK
        text description
    }
    
    users ||--|| roles : has_role
    users ||--|| users : created_by
    users ||--|| users : updated_by
    roles ||--o{ permissions : has_permissions
```

### 2. Database Query Flow
```mermaid
graph TD
    A[Controller needs data] --> B[Call Model method]
    B --> C[Model constructs SQL query]
    C --> D[Execute query via pool.query()]
    D --> E[Database processes query]
    E --> F[Return result rows]
    F --> G[Model processes/formats data]
    G --> H[Return to Controller]
    H --> I[Controller uses data for response]
```

### 3. User Authentication Query
```sql
-- Authentication query in authenticateToken:
SELECT u.*, r.name as role_name, r.permissions 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE u.id = $1

-- Results in req.user object:
{
  id: 5,
  username: 'john',
  email: 'john@email.com',
  role_id: 2,
  role_name: 'admin',
  permissions: [1, 2, 3, 4]  -- Array of permission IDs
}
```

---

## Error Handling Flow

### 1. Error Types and Handling
```mermaid
graph TD
    A[Error Occurs] --> B{Error Type?}
    B -->|Validation Error| C[Return form with error message]
    B -->|Authentication Error| D[Redirect to login]
    B -->|Authorization Error| E[Render 403 error page]
    B -->|Database Error| F[Log error + render 500 page]
    B -->|Not Found Error| G[Render 404 error page]
    
    C --> C1[Pass error to template]
    C1 --> C2[Display error in form]
    
    D --> D1[Clear session/cookies]
    D1 --> D2[Redirect with error message]
    
    E --> E1[Render error template with user context]
    
    F --> F1[console.error for debugging]
    F1 --> F2[Generic error message to user]
```

### 2. Form Error Flow (POST-Redirect-GET Pattern)
```mermaid
sequenceDiagram
    participant U as User
    participant C as Controller
    participant V as Validation
    participant B as Browser

    U->>C: POST form with invalid data
    C->>V: Validate input
    V->>C: Validation error
    C->>B: res.redirect('/form?error=...')
    B->>C: GET /form?error=...
    C->>B: Render form with req.query.error
    B->>U: Show form with error message
```

### 3. Error Template Data
```javascript
// All error renders include:
res.render('error', {
    message: 'Error description',
    user: req.user,  // For navigation/context
    // currentPath: req.path || '/'  // Commented out
});
```

---

## Route Protection Flow

### 1. Protected Route Stack
```mermaid
graph TD
    A[Request to /users] --> B[authenticateToken middleware]
    B --> C{User authenticated?}
    C -->|No| D[Redirect to login]
    C -->|Yes| E[checkPermission('view_user')]
    E --> F{Has permission?}
    F -->|No| G[403 Error page]
    F -->|Yes| H[UserController.index]
    H --> I[Render users page]
```

### 2. Route Definition Example
```javascript
// In routes/users.js:
router.get('/', 
    authenticateToken,           // 1st: Check if logged in
    checkPermission('view_user'), // 2nd: Check permission
    UserController.index         // 3rd: Execute controller
);

router.post('/', 
    authenticateToken,
    checkPermission('add_user'),
    UserController.create
);
```

### 3. Middleware Chain Flow
```mermaid
sequenceDiagram
    participant R as Request
    participant A as authenticateToken
    participant P as checkPermission
    participant C as Controller

    R->>A: Incoming request
    A->>A: Verify JWT token
    A->>A: Query user + permissions
    A->>A: Set req.user
    A->>P: next()
    P->>P: Check required permission
    P->>P: Verify user has permission
    P->>C: next()
    C->>C: Execute business logic
    C->>R: Send response
```

---

## Session and Cookie Flow

### 1. Session Management
```mermaid
graph TD
    A[User logs in] --> B[Generate JWT token]
    B --> C[Store token in session]
    C --> D[Set httpOnly cookie]
    D --> E[User makes requests]
    E --> F[authenticateToken reads token]
    F --> G{Token valid?}
    G -->|Yes| H[Continue with request]
    G -->|No| I[Clear session + cookie]
    I --> J[Redirect to login]
```

### 2. Cookie Configuration
```javascript
// Cookie settings for security:
res.cookie('token', token, {
    httpOnly: true,        // Prevent XSS attacks
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    // secure: true,       // HTTPS only (production)
    // sameSite: 'strict'  // CSRF protection
});
```

### 3. Logout Flow
```mermaid
sequenceDiagram
    participant U as User
    participant S as Server
    participant DB as Database

    U->>S: GET/POST /logout
    S->>S: req.session.destroy()
    S->>S: res.clearCookie('token')
    S->>U: Redirect to /login?success=Logged out
```

---

## Template Rendering Flow

### 1. EJS Template Flow
```mermaid
graph TD
    A[Controller ready to respond] --> B[Prepare template data]
    B --> C[Call res.render()]
    C --> D[EJS processes template]
    D --> E[Include partials if needed]
    E --> F[Inject data variables]
    F --> G[Generate HTML]
    G --> H[Send to client]
```

### 2. Template Data Structure
```javascript
// Common template data pattern:
res.render('users/index', {
    users: userData,              // Main data
    user: req.user,              // Current user context  
    // currentPath: req.path,    // Navigation (commented out)
    success: req.query.success,  // Success messages
    error: req.query.error       // Error messages
});
```

### 3. Conditional Rendering
```ejs
<!-- Template uses user context for permissions -->
<% if (user && user.role_name === 'admin') { %>
    <a href="/users/create">Add User</a>
<% } %>

<!-- Error/success message display -->
<% if (error) { %>
    <div class="alert alert-danger"><%= error %></div>
<% } %>

<% if (success) { %>
    <div class="alert alert-success"><%= success %></div>
<% } %>
```

---

## Performance Optimizations

### 1. Promise.all Usage
```javascript
// Concurrent database queries for better performance:
const rolesWithUserCount = await Promise.all(
    roles.map(async (role) => {
        const userCount = await Role.getUserCount(role.id);
        return { ...role, userCount };
    })
);

// Instead of sequential (slow):
// for (const role of roles) {
//     const userCount = await Role.getUserCount(role.id);
//     role.userCount = userCount;
// }
```

### 2. Database Connection Pooling
```javascript
// Using connection pool for better performance:
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

// Automatic connection management
// No need to manually open/close connections
```

---

## Security Features

### 1. Security Measures Implemented
```mermaid
graph TD
    A[Security Measures] --> B[JWT Tokens]
    A --> C[Password Hashing]
    A --> D[HTTP-Only Cookies]
    A --> E[Input Validation]
    A --> F[SQL Injection Prevention]
    A --> G[Permission-Based Access]
    
    B --> B1[Stateless authentication]
    B --> B2[Token expiration]
    
    C --> C1[bcrypt with salt rounds]
    
    D --> D1[XSS attack prevention]
    
    E --> E1[Joi validation schemas]
    
    F --> F1[Parameterized queries]
    
    G --> G1[Role-based permissions]
    G --> G2[Middleware protection]
```

### 2. Validation Flow
```javascript
// Joi validation example:
const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

const { error, value } = schema.validate(req.body);
if (error) {
    // Handle validation error
    return res.render('form', { 
        error: error.details[0].message 
    });
}
```

---

This documentation provides a comprehensive overview of how your UMS application works, from the initial request to the final response, including all middleware, authentication, authorization, and database interactions.
