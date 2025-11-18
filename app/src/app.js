const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware de segurança
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});
app.use(limiter);

// Middleware de parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simulação de banco de dados em memória
let todos = [
  {
    id: 1,
    title: 'Estudar Docker na FIAP -> Deploy ArgoCD',
    description: 'Aprender containerização e Kubernetes',
    completed: false,
    priority: 'high',
    category: 'education',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Implementar Blue/Green Deploy',
    description: 'Configurar estratégias avançadas de deployment',
    completed: false,
    priority: 'medium',
    category: 'work',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

let nextId = 3;

// Middleware de validação
const validateTodo = (req, res, next) => {
  const { title, priority, category } = req.body;
  
  if (!title || title.trim().length === 0) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  if (priority && !['low', 'medium', 'high'].includes(priority)) {
    return res.status(400).json({ error: 'Priority must be low, medium, or high' });
  }
  
  if (category && !['personal', 'work', 'education', 'health'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }
  
  next();
};

// Routes

// Health check with deployment info
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'FIAP Todo API',
    version: process.env.VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      color: process.env.DEPLOYMENT_COLOR || 'unknown',
      type: process.env.DEPLOYMENT_TYPE || 'standard',
      hostname: require('os').hostname(),
      platform: process.platform,
      nodeVersion: process.version
    }
  });
});

// Get all todos with filtering
app.get('/api/todos', (req, res) => {
  let filteredTodos = [...todos];
  
  // Filter by completion status
  if (req.query.completed !== undefined) {
    const completed = req.query.completed === 'true';
    filteredTodos = filteredTodos.filter(todo => todo.completed === completed);
  }
  
  // Filter by priority
  if (req.query.priority) {
    filteredTodos = filteredTodos.filter(todo => todo.priority === req.query.priority);
  }
  
  // Filter by category
  if (req.query.category) {
    filteredTodos = filteredTodos.filter(todo => todo.category === req.query.category);
  }
  
  // Search in title and description
  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    filteredTodos = filteredTodos.filter(todo => 
      todo.title.toLowerCase().includes(search) ||
      (todo.description && todo.description.toLowerCase().includes(search))
    );
  }
  
  res.json({
    todos: filteredTodos,
    total: filteredTodos.length,
    filters: req.query,
    deployment: {
      version: process.env.VERSION || '1.0.0',
      color: process.env.DEPLOYMENT_COLOR || 'unknown'
    }
  });
});

// Get todo by ID
app.get('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);
  
  if (!todo) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  res.json(todo);
});

// Create new todo
app.post('/api/todos', validateTodo, (req, res) => {
  const { title, description, priority = 'medium', category = 'personal' } = req.body;
  
  const newTodo = {
    id: nextId++,
    title: title.trim(),
    description: description ? description.trim() : '',
    completed: false,
    priority,
    category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// Update todo
app.put('/api/todos/:id', validateTodo, (req, res) => {
  const id = parseInt(req.params.id);
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  const { title, description, completed, priority, category } = req.body;
  
  todos[todoIndex] = {
    ...todos[todoIndex],
    title: title ? title.trim() : todos[todoIndex].title,
    description: description !== undefined ? description.trim() : todos[todoIndex].description,
    completed: completed !== undefined ? completed : todos[todoIndex].completed,
    priority: priority || todos[todoIndex].priority,
    category: category || todos[todoIndex].category,
    updatedAt: new Date().toISOString()
  };
  
  res.json(todos[todoIndex]);
});

// Delete todo
app.delete('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return res.status(404).json({ error: 'Todo not found' });
  }
  
  const deletedTodo = todos.splice(todoIndex, 1)[0];
  res.json({ message: 'Todo deleted successfully', todo: deletedTodo });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    total: todos.length,
    completed: todos.filter(t => t.completed).length,
    pending: todos.filter(t => !t.completed).length,
    byPriority: {
      high: todos.filter(t => t.priority === 'high').length,
      medium: todos.filter(t => t.priority === 'medium').length,
      low: todos.filter(t => t.priority === 'low').length
    },
    byCategory: {
      personal: todos.filter(t => t.category === 'personal').length,
      work: todos.filter(t => t.category === 'work').length,
      education: todos.filter(t => t.category === 'education').length,
      health: todos.filter(t => t.category === 'health').length
    },
    deployment: {
      version: process.env.VERSION || '1.0.0',
      color: process.env.DEPLOYMENT_COLOR || 'unknown',
      type: process.env.DEPLOYMENT_TYPE || 'standard',
      hostname: require('os').hostname()
    }
  };
  
  res.json(stats);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;
// Deploy test
// New feature
// New feature
