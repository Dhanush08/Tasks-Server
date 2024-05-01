import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { format } from 'date-fns';

const app = express(); // express server instance
const PORT = process.env.PORT || 3000;
var database = null
const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory
const databasePath = path.join(__dirname, 'userTasksData.db')

// used to recognize the incoming request object as JSON object and parses it
app.use(express.json())

const initiateDBandServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    })
    app.listen(PORT, () => {
      console.log(`Server Running at http://localhost:${PORT}/`)
    })
  } catch (error) {
    console.log(`DB Error: ${error}`)
    process.exit(1)
  }
}

// initializing database and server
initiateDBandServer()

// register user API
app.post('/users/', async (request, response) => {
  try {
    const { username, password } = request.body;
    // validations
    if (!username) {
      return response.status(404).send({
        success: false,
        message: "Username is required"
      });
    }
    if (!password) {
      return response.status(404).send({
        success: false,
        message: "Password is required"
      });
    }
    // check user
    const selectUserQuery = `SELECT * FROM users WHERE username='${username}';`;
    const dbUser = await database.get(selectUserQuery);
    if (dbUser) {
      return response.status(400).send({
        success: false,
        message: "User already exists"
      });
    }
    // creating user
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const createUserQuery = `
      INSERT INTO
      users (username, password_hash)
      VALUES ('${username}', '${hashedPassword}');`;
    const dbResponse = await database.run(createUserQuery);
    const userID = dbResponse.lastID;
    response.status(201).send({
      success: true,
      message: "User registered successfully",
      userID,
    });
  }
  catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: "Error in registration",
      error,
    });
  }
});

// login API
app.post('/login/', async (request, response) => {
  try {
    const { username, password } = request.body;
    // validations
    if (!username) {
      return response.status(404).send({
        success: false,
        message: "Username is required"
      });
    }
    if (!password) {
      return response.status(404).send({
        success: false,
        message: "Password is required"
      });
    }
    // check user
    const selectUserQuery = `SELECT * FROM users WHERE username='${username}';`;
    const dbUser = await database.get(selectUserQuery);
    if (!dbUser) {
      return response.status(404).send({
        success: false,
        message: "Invalid user"
      });
    }
    // check password
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password_hash);
    if (!isPasswordMatched) {
      return response.status(400).send({
        success: false,
        message: "Invalid password"
      });
    }
    // generating jwt
    const payload = { username: username };
    const token = jwt.sign(payload, "secret_token");
    response.status(200).send({
      success: true,
      message: "Login successfully",
      token,
    });
  }
  catch (error) { 
    console.log(error);
    response.status(500).send({
      success: false,
      message: "Error in login",
      error,
    });
  }
});

// middleware function to verify jwt
const authenticateToken = (request, response, next) => {
  try {
    let token;
    const authHeader = request.headers["authorization"];
    if (authHeader) {
      token = authHeader.split(" ")[1];
    }
    // token validation
    if (!token) {
      return response.status(401).send({
        success: false,
        message: "Invalid access token"
      });
    }
    // token verification
    jwt.verify(token, "secret_token", async (error, payload) => {
      if (error) {
        response.status(401).send({
          success: false,
          message: "Invalid jwt",
          error,
        });
      }
      else {
        request.username = payload.username;
        next();
      }
    });
  }
  catch (e) {
    console.log(e);
    response.status(401).send({
      success: false,
      message: "Authentication failed",
      e,
    });
  }
};

// task creation
app.post('/tasks/', authenticateToken, async (request, response) => {
  try {
    const {
      title,
      description,
      status,
      assigneeId,
      createdAt,
      updatedAt
    } = request.body;
    // validations
    if (!title) {
      return response.status(404).send({
        success: false,
        message: "Title is required"
      });
    }
    if (!description) {
      return response.status(404).send({
        success: false,
        message: "Description is required"
      });
    }
    if (!status) {
      return response.status(404).send({
        success: false,
        message: "Status is required"
      });
    }
    if (!assigneeId) {
      return response.status(404).send({
        success: false,
        message: "Assignee ID is required"
      });
    }
    if (!createdAt) {
      return response.status(404).send({
        success: false,
        message: "Datetime of creation is required"
      });
    }
    if (!updatedAt) {
      return response.status(404).send({
        success: false,
        message: "Datetime of updation is required"
      });
    }
    // assignee validation
    const selectUserIdsQuery = `SELECT id FROM users`;
    const idsArray = await database.all(selectUserIdsQuery);
    const isAssigneePresent = idsArray.some((item) => {
      return item.id === assigneeId;
    })
    // unregistered assignee
    if (!isAssigneePresent) {
      return response.status(404).send({
        success: false,
        message: "Unregistered assignee"
      });
    }
    // task insertion
    const addTaskQuery = `
      INSERT INTO
      tasks (
        title,
        description,
        status,
        assignee_id,
        created_at,
        updated_at
      )
      VALUES (
        '${title}', 
        '${description}', 
        '${status}', 
        '${assigneeId}', 
        '${createdAt}', 
        '${updatedAt}'
      );`;
    const dbResponse = await database.run(addTaskQuery);
    const taskID = dbResponse.lastID;
    response.status(201).send({
      success: true,
      message: "Task added successfully",
      taskID,
    });
  }
  catch (error) {
    console.log(error);
    response.status(500).send({
      success: false,
      message: "Task insertion failed",
      error,
    });
  }
});

// tasks retrieval
app.get('/tasks/', authenticateToken, async (request, response) => {
  try {
    // retrieving the tasks
    const getTasksQuery = `SELECT * FROM tasks;`;
    const tasksArray = await database.all(getTasksQuery);
    response.status(200).send({
      success: true,
      message: "Tasks retrieved succesfully",
      tasksArray,
    });
  }
  catch (error) {
    response.status(500).send({
      success: false,
      message: "Tasks retrieval failed",
      error,
    });
  }
});

// task retrieval
app.get('/tasks/:taskID/', authenticateToken, async (request, response) => {
  try {
    const { taskID } = request.params;
    // retrieving the task
    const getTaskQuery = `SELECT * FROM tasks WHERE id=${taskID};`;
    const task = await database.get(getTaskQuery);
    // task validation
    if (!task) { 
      return response.status(404).send({
        success: false,
        message: "Invalid task ID"
      });
    }
    response.status(200).send({
      success: true,
      message: "Task retrieved succesfully",
      task,
    });
  }
  catch (error) { 
    response.status(500).send({
      success: false,
      message: "Task retrieval failed",
      error,
    });
  }
});

// task updation
app.put('/tasks/:taskID/', authenticateToken, async (request, response) => {
  try {
    // updating the task
    const { taskID } = request.params;
    const {
      title,
      description,
      status
    } = request.body;
    // validations
    const getTaskQuery = `SELECT * FROM tasks WHERE id=${taskID};`;
    const task = await database.get(getTaskQuery);
    // task validation
    if (!task) { 
      return response.status(404).send({
        success: false,
        message: "Invalid task ID"
      });
    }
    if (!title) {
      return response.status(404).send({
        success: false,
        message: "Title is required"
      });
    }
    if (!description) {
      return response.status(404).send({
        success: false,
        message: "Description is required"
      });
    }
    if (!status) {
      return response.status(404).send({
        success: false,
        message: "Status is required"
      });
    }
    // task updation
    const today = new Date();
    const formattedDateTime = format(today, 'yyyy-MM-dd HH:mm:ss');
    const updateTaskQuery = `
      UPDATE tasks
      SET
      title='${title}',
      description='${description}',
      status='${status}',
      updated_at='${formattedDateTime}'
      WHERE id=${taskID};`;
    await database.run(updateTaskQuery);
    response.status(200).send({
      success: true,
      message: "Task updated succesfully"
    });
  }
  catch (error) {
    response.status(500).send({
      success: false,
      message: "Task updation failed",
      error,
    });
  }
});

// task deletion
app.delete('/tasks/:taskID/', authenticateToken, async (request, response) => {
  try {
    const { taskID } = request.params;
    // retrieving the task
    const getTaskQuery = `SELECT * FROM tasks WHERE id=${taskID};`;
    const task = await database.get(getTaskQuery);
    // task validation
    if (!task) { 
      return response.status(404).send({
        success: false,
        message: "Invalid task ID"
      });
    }
    // task deletion
    const deleteTaskQuery = `DELETE FROM tasks WHERE id=${taskID};`;
    await database.run(deleteTaskQuery);
    response.status(200).send({
      success: true,
      message: "Task deleted successfully"
    });
  }
  catch (error) { 
    response.status(500).send({
      success: false,
      message: "Task deletion failed",
      error,
    });
  }
});