# Team Task Manager

A full-stack collaborative task management web application. Users can create/join projects, assign tasks, track progress, and manage team members. Built with Node.js, Express, MongoDB, and Vanilla HTML/CSS/JavaScript.

## Features

- **User Authentication**: Secure JWT-based login/signup
- **Project Management**: Create projects (creator becomes Admin), invite members
- **Task Management**: Create tasks with title, description, due date, priority; update status (To Do → In Progress → Done)
- **Role-Based Access**: Admins manage tasks/members, Members view assigned tasks
- **Dashboard**: View total tasks, tasks by status, overdue tasks, tasks per user
- **Responsive UI**: Clean, modern interface

## Tech Stack

- **Backend**: Node.js, Express, MongoDB (with Mongoose)
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Authentication**: JWT (jsonwebtoken, bcryptjs)
- **Deployment**: Railway

## Local Setup

### Prerequisites
- Node.js (v14+)
- MongoDB (local or Atlas cluster)

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Create `.env` file with your values:
```bash
cp .env.example .env
```

Edit `.env`:
```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
PORT=5000
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:5000 in your browser

## Deployment on Railway

### Step 1: Prepare Repository
```bash
git init
git add .
git commit -m "Initial commit"
```

Push to GitHub (create a repo if needed):
```bash
git remote add origin https://github.com/yourusername/team-task-manager.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway auto-detects Node.js and reads `package.json`
5. Add environment variables in Railway dashboard:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A strong secret key
   - `PORT`: 5000 (optional, Railway assigns one)

6. Deploy

### Step 3: Verify Deployment
- Railway provides a public URL (e.g., `https://app-production-xxxx.up.railway.app`)
- Test login/signup and create a project

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/members` - Add member (Admin only)
- `DELETE /api/projects/:id/members/:userId` - Remove member (Admin only)

### Tasks
- `POST /api/tasks` - Create task (Admin only)
- `GET /api/tasks/project/:projectId` - Get project tasks
- `PATCH /api/tasks/:id/status` - Update task status
- `PATCH /api/tasks/:id/assign` - Assign task to user (Admin only)
- `DELETE /api/tasks/:id` - Delete task (Admin only)

### Dashboard
- `GET /api/dashboard` - Get stats (total, by status, overdue, by user)

## Project Structure

```
├── server.js                    # Express server & MongoDB connection
├── package.json
├── .env                        # Environment variables (create locally)
├── .env.example               # Template for env variables
├── backend/
│   ├── models/
│   │   ├── User.js            # User schema with password hashing
│   │   ├── Project.js         # Project schema with admin/members
│   │   └── Task.js            # Task schema with status/priority
│   ├── routes/
│   │   ├── auth.js            # Login/Register
│   │   ├── projects.js        # Project CRUD & member management
│   │   ├── tasks.js           # Task CRUD & status updates
│   │   └── dashboard.js       # Stats & aggregations
│   └── middleware/
│       └── auth.js            # JWT verification & role checking
└── frontend/
    ├── index.html             # Single-page app (Auth + Dashboard)
    ├── css/
    │   └── style.css          # Responsive styling
    └── js/
        └── main.js            # Client logic (Form handling, API calls, DOM updates)
```

## Usage Example

### 1. Register/Login
- Visit the application
- Sign up with name, email, password
- Or login with existing credentials

### 2. Create Project
- Click "Projects" → "+ New Project"
- Enter project name & description

### 3. Add Members
- Go to project → "Members" tab
- Enter member email & click "Add Member"
- Member receives no notification (inform manually)

### 4. Create & Manage Tasks
- Go to project → "Tasks" tab
- Click "+ New Task"
- Select task status from dropdown (To Do, In Progress, Done)
- Tasks assigned to you appear in dashboard

### 5. View Dashboard
- Click "Dashboard" to see overall stats
- Monitor total tasks, overdue tasks, and distribution

## Key Features Explained

### Role-Based Access
- **Admin** (project creator):
  - Create tasks
  - Assign tasks to members
  - Add/remove project members
  - Update task status or delete tasks
  
- **Member**:
  - View assigned projects
  - Update status of assigned tasks
  - View project details

### Overdue Tasks
- Tasks with due date before today and status ≠ "Done"
- Counted in dashboard

### Dashboard Stats
- **Total Tasks**: Across all projects
- **In Progress**: Count of "In Progress" tasks
- **Completed**: Count of "Done" tasks
- **Overdue**: Count of past-due tasks
- **Tasks by User**: Count of tasks assigned to each member

## Notes

- Passwords are hashed with bcryptjs (10 salt rounds)
- JWTs expire in 7 days
- Data persists in MongoDB
- Frontend stores JWT in localStorage (expires on logout)
- No real-time updates (refresh page to see changes)

## Future Enhancements

- Real-time updates (WebSockets)
- Task comments & attachments
- Email notifications
- Advanced filtering & search
- Task dependencies
- Team collaboration features

## Support

For issues or questions, check the API documentation above or review `server.js` for endpoint details.

