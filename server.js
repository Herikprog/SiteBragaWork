require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const { db, initializeDatabase, insertAndGetId } = require('./db-config');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('public/uploads'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'public/uploads/projects';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

const sessionStore = new Map();

function generateSessionToken() {
  return require('crypto').randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || !sessionStore.has(token)) {
    return res.status(401).json({ success: false, message: 'Não autorizado. Faça login primeiro.' });
  }

  const session = sessionStore.get(token);
  if (Date.now() > session.expiresAt) {
    sessionStore.delete(token);
    return res.status(401).json({ success: false, message: 'Sessão expirada. Faça login novamente.' });
  }

  req.userId = session.userId;
  next();
}

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.json({ success: false, message: 'Usuário e senha são obrigatórios.' });
    }

    const result = await db.query('SELECT * FROM admin_users WHERE username = $1 AND is_active = TRUE', [username]);
    
    if (result.rows.length === 0) {
      return res.json({ success: false, message: 'Usuário ou senha incorretos.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.json({ success: false, message: 'Usuário ou senha incorretos.' });
    }

    await db.query('UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const sessionToken = generateSessionToken();
    sessionStore.set(sessionToken, {
      userId: user.id,
      username: user.username,
      expiresAt: Date.now() + (24 * 60 * 60 * 1000)
    });

    res.json({ 
      success: true, 
      message: 'Login realizado com sucesso!',
      token: sessionToken,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.json({ success: false, message: 'Erro ao realizar login.' });
  }
});

app.post('/api/submit-quote', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, countryCode, projectDescription } = req.body;

    if (!firstName || !lastName || !email || !phone || !projectDescription) {
      return res.json({ success: false, message: 'Todos os campos são obrigatórios.' });
    }

    const quoteId = await insertAndGetId(
      `INSERT INTO quote_requests (first_name, last_name, email, country_code, phone, project_description, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [firstName, lastName, email, countryCode || '+55', phone, projectDescription, 'pending']
    );

    res.json({ 
      success: true, 
      message: 'Solicitação enviada com sucesso! Entraremos em contato em breve.',
      quoteId: quoteId
    });
  } catch (error) {
    console.error('Erro ao enviar solicitação:', error);
    res.json({ success: false, message: 'Erro ao enviar solicitação. Tente novamente.' });
  }
});

app.get('/api/get-quotes', requireAuth, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM quote_requests 
      ORDER BY 
        CASE WHEN status = 'pending' THEN 1 
             WHEN status = 'in_progress' THEN 2 
             ELSE 3 END,
        created_at DESC
    `);

    const quotes = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      countryCode: row.country_code,
      phone: row.phone,
      projectDescription: row.project_description,
      status: row.status,
      adminNotes: row.admin_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    res.json(quotes);
  } catch (error) {
    console.error('Erro ao buscar solicitações:', error);
    res.json([]);
  }
});

app.post('/api/update-quote', requireAuth, async (req, res) => {
  try {
    const { id, status, adminNotes } = req.body;

    if (!id || !status) {
      return res.json({ success: false, message: 'ID e status são obrigatórios.' });
    }

    const query = adminNotes 
      ? 'UPDATE quote_requests SET status = $1, admin_notes = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3'
      : 'UPDATE quote_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2';

    const params = adminNotes ? [status, adminNotes, id] : [status, id];

    await db.query(query, params);

    res.json({ success: true, message: 'Solicitação atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar solicitação:', error);
    res.json({ success: false, message: 'Erro ao atualizar solicitação.' });
  }
});

app.post('/api/delete-quote', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: 'ID é obrigatório.' });
    }

    await db.query('DELETE FROM quote_requests WHERE id = $1', [id]);

    res.json({ success: true, message: 'Solicitação excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir solicitação:', error);
    res.json({ success: false, message: 'Erro ao excluir solicitação.' });
  }
});

app.get('/api/get-projects', async (req, res) => {
  try {
    const adminView = req.query.admin === 'true';
    
    const query = adminView 
      ? 'SELECT * FROM projects ORDER BY display_order ASC, created_at DESC'
      : 'SELECT * FROM projects WHERE status = $1 ORDER BY display_order ASC, created_at DESC';
    
    const params = adminView ? [] : ['aprovado'];
    const result = await db.query(query, params);

    const projects = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      projectLink: row.project_link,
      status: row.status || 'pendente',
      isActive: row.is_active,
      displayOrder: row.display_order,
      createdAt: row.created_at
    }));

    res.json(projects);
  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.json([]);
  }
});

app.post('/api/save-project', requireAuth, async (req, res) => {
  try {
    const { id, title, description, mediaUrl, mediaType, projectLink, status, isActive, displayOrder } = req.body;

    if (!title) {
      return res.json({ success: false, message: 'Título é obrigatório.' });
    }

    let projectStatus = status;
    let active = isActive;

    if (!projectStatus && isActive !== undefined) {
      projectStatus = isActive ? 'aprovado' : 'cancelado';
    } else if (!projectStatus) {
      projectStatus = 'pendente';
    }

    if (active === undefined) {
      active = projectStatus === 'aprovado';
    }

    if (id) {
      await db.query(
        `UPDATE projects 
         SET title = $1, description = $2, media_url = COALESCE($3, media_url), 
             media_type = COALESCE($4, media_type), project_link = $5, 
             status = $6, is_active = $7, display_order = COALESCE($8, display_order), 
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $9`,
        [title, description, mediaUrl, mediaType, projectLink, projectStatus, active, displayOrder, id]
      );
    } else {
      await db.query(
        `INSERT INTO projects (title, description, media_url, media_type, project_link, status, is_active, display_order) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [title, description, mediaUrl || 'https://via.placeholder.com/600x400', mediaType || 'image', projectLink, projectStatus, active, displayOrder || 0]
      );
    }

    res.json({ success: true, message: 'Projeto salvo com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar projeto:', error);
    res.json({ success: false, message: 'Erro ao salvar projeto.' });
  }
});

app.post('/api/delete-project', requireAuth, async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: 'ID é obrigatório.' });
    }

    await db.query('DELETE FROM projects WHERE id = $1', [id]);

    res.json({ success: true, message: 'Projeto excluído com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir projeto:', error);
    res.json({ success: false, message: 'Erro ao excluir projeto.' });
  }
});

app.post('/api/upload-image', requireAuth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: 'Nenhum arquivo foi enviado.' });
    }

    const imageUrl = `/uploads/projects/${req.file.filename}`;
    
    res.json({ 
      success: true, 
      message: 'Imagem enviada com sucesso!',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    if (error.message.includes('Tipo de arquivo')) {
      return res.json({ success: false, message: error.message });
    }
    res.json({ success: false, message: 'Erro ao fazer upload da imagem.' });
  }
});

app.get('/api/list-images', requireAuth, async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, 'public', 'uploads', 'projects');
    
    if (!fs.existsSync(uploadDir)) {
      return res.json({ success: true, images: [] });
    }

    const files = fs.readdirSync(uploadDir);
    const images = files
      .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        url: `/uploads/projects/${file}`,
        uploadDate: fs.statSync(path.join(uploadDir, file)).mtime
      }))
      .sort((a, b) => b.uploadDate - a.uploadDate);

    res.json({ success: true, images });
  } catch (error) {
    console.error('Erro ao listar imagens:', error);
    res.json({ success: false, message: 'Erro ao listar imagens.', images: [] });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 Servidor BragaWork rodando em http://0.0.0.0:${PORT}`);
  console.log(`📊 Painel Admin: http://0.0.0.0:${PORT}/admin.html\n`);
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  }
});
