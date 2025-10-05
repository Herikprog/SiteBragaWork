require('dotenv').config();

const DB_TYPE = process.env.DB_TYPE || 'postgres';

let db;

if (DB_TYPE === 'mysql') {
  const mysql = require('mysql2/promise');
  
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
    throw new Error('❌ Configure as variáveis: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  }
  
  const mysqlConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  };
  
  db = mysql.createPool(mysqlConfig);
  
  db.query = async function(sql, params = []) {
    const mysqlSql = sql.replace(/\$(\d+)/g, '?');
    const [rows, fields] = await this.execute(mysqlSql, params);
    
    if (Array.isArray(rows)) {
      return { rows: rows };
    } else if (rows.insertId) {
      return { rows: [{ insertId: rows.insertId }] };
    } else {
      return { rows: [rows] };
    }
  };
  
  console.log('✅ Conectado ao MySQL');
  
} else {
  const { Pool } = require('pg');
  
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  DATABASE_URL não configurada. Configure as variáveis de ambiente para produção.');
    console.warn('⚠️  Para desenvolvimento local com PostgreSQL, defina DATABASE_URL');
    console.warn('⚠️  Para MySQL, defina DB_TYPE=mysql e as credenciais DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  }
  
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  console.log('✅ Configurado para usar PostgreSQL');
}

const createTablesMySQL = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quote_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      country_code VARCHAR(10) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      project_description TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      admin_notes TEXT NULL,
      assigned_to INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT chk_quote_status CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected'))
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NULL,
      media_url VARCHAR(500) NOT NULL,
      media_type VARCHAR(10) DEFAULT 'image',
      project_link VARCHAR(500) NULL,
      status VARCHAR(20) DEFAULT 'pendente',
      is_active BOOLEAN DEFAULT TRUE,
      display_order INT DEFAULT 0,
      views_count INT DEFAULT 0,
      created_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT chk_media_type CHECK (media_type IN ('image', 'video')),
      CONSTRAINT chk_project_status CHECK (status IN ('pendente', 'aprovado', 'cancelado'))
    )
  `);
};

const createTablesPostgreSQL = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT TRUE,
      last_login TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS quote_requests (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(50) NOT NULL,
      last_name VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      country_code VARCHAR(10) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      project_description TEXT NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      admin_notes TEXT NULL,
      assigned_to INTEGER NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_quote_status CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected'))
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT NULL,
      media_url VARCHAR(500) NOT NULL,
      media_type VARCHAR(10) DEFAULT 'image',
      project_link VARCHAR(500) NULL,
      status VARCHAR(20) DEFAULT 'pendente',
      is_active BOOLEAN DEFAULT TRUE,
      display_order INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      created_by INTEGER NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT chk_media_type CHECK (media_type IN ('image', 'video')),
      CONSTRAINT chk_project_status CHECK (status IN ('pendente', 'aprovado', 'cancelado'))
    )
  `);

  await db.query(`
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name='projects' AND column_name='status') THEN
        ALTER TABLE projects ADD COLUMN status VARCHAR(20) DEFAULT 'aprovado';
        ALTER TABLE projects ADD CONSTRAINT chk_project_status CHECK (status IN ('pendente', 'aprovado', 'cancelado'));
        UPDATE projects SET status = CASE WHEN is_active THEN 'aprovado' ELSE 'cancelado' END;
      END IF;
    END $$;
  `);
};

const initializeDatabase = async () => {
  try {
    if (DB_TYPE === 'mysql') {
      await createTablesMySQL();
    } else {
      await createTablesPostgreSQL();
    }

    const bcrypt = require('bcryptjs');
    
    const adminCheck = await db.query('SELECT id FROM admin_users WHERE username = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      await db.query(
        'INSERT INTO admin_users (username, password_hash, full_name, email) VALUES ($1, $2, $3, $4)',
        ['admin', passwordHash, 'Administrador BragaWork', 'admin@bragawork.com']
      );
      console.log('✅ Usuário admin padrão criado (usuário: admin, senha: admin123)');
    }

    const projectsCheck = await db.query('SELECT COUNT(*) as count FROM projects');
    const projectCount = DB_TYPE === 'mysql' ? projectsCheck.rows[0].count : projectsCheck.rows[0].count;
    
    if (projectCount === 0 || projectCount === '0') {
      const sampleProjects = [
        {
          title: 'Site Corporativo Moderno',
          description: 'Website empresarial desenvolvido com tecnologias avançadas, design responsivo e otimizado para conversões.',
          mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
          order: 1
        },
        {
          title: 'E-commerce Completo',
          description: 'Loja virtual robusta com carrinho de compras, sistema de pagamento integrado e painel administrativo.',
          mediaUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
          order: 2
        },
        {
          title: 'Portal de Notícias',
          description: 'Portal dinâmico com sistema de gestão de conteúdo e newsletter automática.',
          mediaUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
          order: 3
        }
      ];

      for (const project of sampleProjects) {
        await db.query(
          'INSERT INTO projects (title, description, media_url, media_type, display_order, status, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [project.title, project.description, project.mediaUrl, 'image', project.order, 'aprovado', true]
        );
      }
      console.log('✅ Projetos de exemplo criados');
    }

    console.log('✅ Banco de dados inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  }
};

async function insertAndGetId(query, params) {
  if (DB_TYPE === 'mysql') {
    const cleanQuery = query.replace(/\s+RETURNING\s+\w+/i, '').trim();
    const result = await db.query(cleanQuery, params);
    return result.rows[0]?.insertId;
  } else {
    const result = await db.query(query, params);
    return result.rows[0]?.id;
  }
}

module.exports = { db, initializeDatabase, DB_TYPE, insertAndGetId };
