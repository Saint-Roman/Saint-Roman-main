const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, PageBreak, ShadingType, TableLayoutType,
  Header, Footer, PageNumber, NumberFormat
} = require('docx');
const fs = require('fs');
const path = require('path');

// Helper: diagram image paths
const DIAGRAM_DIR = path.join(
  'C:\\Users\\DELL-G3 15-3500\\.gemini\\antigravity-ide\\brain\\09b7006b-70ea-480b-9924-846222f40ad5'
);

function findDiagram(prefix) {
  const files = fs.readdirSync(DIAGRAM_DIR);
  const match = files.find(f => f.startsWith(prefix) && f.endsWith('.png'));
  return match ? path.join(DIAGRAM_DIR, match) : null;
}

// Color constants
const NAVY = '1a202c';
const TEAL = '319795';
const LIGHT_GRAY = 'f7fafc';
const WHITE = 'ffffff';
const DARK_GRAY = '4a5568';

// Helper functions
function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ text, heading: level, spacing: { before: 300, after: 150 } });
}

function para(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [new TextRun({ text, size: 22, font: 'Calibri', ...opts })]
  });
}

function boldPara(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: 'Calibri', bold: true })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Calibri' })]
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    shading: { type: ShadingType.CLEAR, fill: 'edf2f7' },
    children: [new TextRun({ text, size: 18, font: 'Consolas' })]
  });
}

function multiLineCode(lines) {
  return lines.map(line =>
    new Paragraph({
      spacing: { after: 20 },
      shading: { type: ShadingType.CLEAR, fill: 'edf2f7' },
      indent: { left: 200 },
      children: [new TextRun({ text: line, size: 18, font: 'Consolas' })]
    })
  );
}

function tableCell(text, opts = {}) {
  return new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    children: [
      new Paragraph({
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
        children: [new TextRun({
          text, size: 20, font: 'Calibri',
          bold: opts.bold || false,
          color: opts.color || '2d3748'
        })]
      })
    ]
  });
}

function headerCell(text, width) {
  return tableCell(text, { bold: true, shading: NAVY, color: WHITE, width });
}

function makeTable(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => headerCell(h, widths ? widths[i] : undefined))
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, ci) => tableCell(cell, {
            width: widths ? widths[ci] : undefined,
            shading: ri % 2 === 0 ? LIGHT_GRAY : WHITE
          }))
        })
      )
    ]
  });
}

function addDiagram(filePath, width = 600, height = 400) {
  if (!filePath || !fs.existsSync(filePath)) {
    return para('[Diagram image not found]', { italics: true, color: '999999' });
  }
  const imgData = fs.readFileSync(filePath);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    children: [
      new ImageRun({
        data: imgData,
        transformation: { width, height },
        type: 'png'
      })
    ]
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// ===================== BUILD DOCUMENT =====================
async function generateReport() {
  const sections = [];

  // ---------- COVER PAGE ----------
  sections.push({
    properties: {},
    children: [
      new Paragraph({ spacing: { before: 3000 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'SAINT ROMAN', size: 72, font: 'Calibri', bold: true, color: NAVY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Fashion & Lifestyle Store', size: 36, font: 'Calibri', color: TEAL })]
      }),
      new Paragraph({ spacing: { after: 600 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: 'Backend Architecture Report', size: 48, font: 'Calibri', bold: true, color: NAVY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Admin Panel — Complete Technical Documentation', size: 28, font: 'Calibri', color: DARK_GRAY })]
      }),
      new Paragraph({ spacing: { after: 800 } }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Date: July 16, 2026', size: 24, font: 'Calibri', color: DARK_GRAY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: 'Version: 1.0', size: 24, font: 'Calibri', color: DARK_GRAY })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Scope: Static HTML → Dynamic CMS with Admin Panel', size: 24, font: 'Calibri', color: DARK_GRAY })]
      }),
    ]
  });

  // ---------- TABLE OF CONTENTS (manual) ----------
  const tocItems = [
    '1. Executive Summary',
    '2. Technology Stack',
    '3. System Architecture',
    '4. Database Schema (14 Tables)',
    '5. API Endpoints (40+ Routes)',
    '6. Authentication & Security',
    '7. Middleware Pipeline',
    '8. Model Layer (Data Access)',
    '9. File Upload Strategy',
    '10. Data Seeding',
    '11. Admin Panel UI Architecture',
    '12. Server Entry Point',
    '13. Development Roadmap',
    '14. Environment Configuration',
    '15. Summary & Metrics'
  ];

  sections.push({
    properties: {},
    children: [
      heading('Table of Contents'),
      new Paragraph({ spacing: { after: 200 } }),
      ...tocItems.map(item => new Paragraph({
        spacing: { after: 80 },
        children: [new TextRun({ text: item, size: 24, font: 'Calibri', color: NAVY })]
      })),
      pageBreak()
    ]
  });

  // ---------- MAIN CONTENT ----------
  const mainChildren = [];

  // === 1. Executive Summary ===
  mainChildren.push(heading('1. Executive Summary'));
  mainChildren.push(para('The Saint Roman storefront is currently a static HTML template with no backend, no database, and no admin capabilities. This report details the complete backend architecture required to add a full-featured admin panel where the site owner can manage every piece of content — from the topbar announcement to the footer copyright.'));
  mainChildren.push(para('The backend will use Node.js + Express as the server, SQLite as the database, and EJS for server-side rendering. This stack was chosen for simplicity, zero-configuration setup, and the fact that the project already runs on Node.js/npm.'));
  mainChildren.push(pageBreak());

  // === 2. Technology Stack ===
  mainChildren.push(heading('2. Technology Stack'));
  mainChildren.push(para('The following technologies form the core of the backend system:'));
  mainChildren.push(new Paragraph({ spacing: { after: 100 } }));
  mainChildren.push(makeTable(
    ['Component', 'Technology', 'Version', 'Rationale'],
    [
      ['Runtime', 'Node.js', '22.x', 'Already installed on the system'],
      ['Framework', 'Express.js', '4.x', 'Industry-standard, lightweight, massive ecosystem'],
      ['Database', 'SQLite (better-sqlite3)', '11.x', 'Zero-config, file-based, no separate DB server'],
      ['Templating', 'EJS', '3.x', 'Simple HTML-like syntax, easy to convert existing HTML'],
      ['Authentication', 'express-session + bcryptjs', '—', 'Secure session-based login with hashed passwords'],
      ['File Uploads', 'multer', '1.x', 'Handles multipart/form-data for image uploads'],
      ['Environment', 'dotenv', '16.x', 'Manages secrets (session key, admin credentials)'],
      ['Flash Messages', 'connect-flash', '0.1.x', 'Success/error notifications in admin UI'],
      ['Validation', 'express-validator', '7.x', 'Input sanitization and validation'],
      ['Dev Tools', 'nodemon', '3.x', 'Auto-restart server on file changes']
    ],
    [15, 25, 10, 50]
  ));

  mainChildren.push(new Paragraph({ spacing: { after: 200 } }));
  mainChildren.push(boldPara('npm Dependencies (package.json):'));
  mainChildren.push(...multiLineCode([
    '{',
    '  "dependencies": {',
    '    "express": "^4.21.0",',
    '    "ejs": "^3.1.10",',
    '    "express-ejs-layouts": "^2.5.1",',
    '    "better-sqlite3": "^11.6.0",',
    '    "bcryptjs": "^2.4.3",',
    '    "express-session": "^1.18.0",',
    '    "connect-flash": "^0.1.1",',
    '    "multer": "^1.4.5-lts.1",',
    '    "dotenv": "^16.4.5",',
    '    "express-validator": "^7.2.0"',
    '  },',
    '  "devDependencies": {',
    '    "nodemon": "^3.1.0"',
    '  }',
    '}'
  ]));
  mainChildren.push(pageBreak());

  // === 3. System Architecture ===
  mainChildren.push(heading('3. System Architecture'));
  mainChildren.push(para('The application follows a classic three-tier architecture: Client → Server → Data. The Express server sits in the middle, routing requests from the browser to the appropriate handlers and database queries.'));
  mainChildren.push(new Paragraph({ spacing: { after: 100 } }));
  mainChildren.push(heading('3.1 Architecture Overview', HeadingLevel.HEADING_2));
  mainChildren.push(addDiagram(findDiagram('system_architecture'), 580, 380));

  mainChildren.push(heading('3.2 Request Flow', HeadingLevel.HEADING_2));
  mainChildren.push(para('Every HTTP request follows this sequence through the server:'));
  mainChildren.push(addDiagram(findDiagram('request_flow'), 580, 420));
  mainChildren.push(pageBreak());

  // === 4. Database Schema ===
  mainChildren.push(heading('4. Database Schema'));
  mainChildren.push(para('The SQLite database (server/data/saint-roman.db) contains 14 tables. Below is the complete schema for each table.'));

  // 4.1 users
  mainChildren.push(heading('4.1 users — Admin Accounts', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Column', 'Type', 'Constraints', 'Description'],
    [
      ['id', 'INTEGER', 'PRIMARY KEY AUTOINCREMENT', 'Unique ID'],
      ['name', 'TEXT', 'NOT NULL', 'Display name'],
      ['email', 'TEXT', 'NOT NULL UNIQUE', 'Login email'],
      ['password', 'TEXT', 'NOT NULL', 'bcrypt hashed password'],
      ['role', 'TEXT', 'DEFAULT "admin"', 'Role (for future multi-role support)'],
      ['created_at', 'DATETIME', 'DEFAULT CURRENT_TIMESTAMP', 'Account creation time']
    ],
    [15, 12, 30, 43]
  ));

  // 4.2 settings
  mainChildren.push(heading('4.2 settings — Global Site Settings', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Column', 'Type', 'Description'],
    [
      ['id', 'INTEGER', 'PRIMARY KEY (always 1)'],
      ['site_title', 'TEXT', 'Browser tab title'],
      ['meta_description', 'TEXT', 'SEO meta description'],
      ['meta_keywords', 'TEXT', 'SEO keywords'],
      ['favicon', 'TEXT', 'Path to favicon image'],
      ['logo', 'TEXT', 'Path to header logo'],
      ['logo_white', 'TEXT', 'Path to footer logo (white)'],
      ['topbar_text', 'TEXT', 'Topbar announcement text'],
      ['topbar_icon', 'TEXT', 'Font Awesome icon class'],
      ['topbar_visible', 'INTEGER', '1 = show, 0 = hide'],
      ['phone', 'TEXT', 'Contact phone number'],
      ['email', 'TEXT', 'Contact email'],
      ['copyright_text', 'TEXT', 'Footer copyright line']
    ],
    [20, 15, 65]
  ));

  // 4.3 categories
  mainChildren.push(heading('4.3 categories — Product Categories', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Column', 'Type', 'Description'],
    [
      ['id', 'INTEGER', 'PRIMARY KEY AUTOINCREMENT'],
      ['name', 'TEXT', 'Category name (e.g., "Men\'s Fashion")'],
      ['slug', 'TEXT', 'URL-friendly slug (UNIQUE)'],
      ['image', 'TEXT', 'Category image path'],
      ['product_count', 'INTEGER', 'Display count'],
      ['sort_order', 'INTEGER', 'Display order']
    ],
    [20, 15, 65]
  ));

  // 4.4 products
  mainChildren.push(heading('4.4 products — All Products', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Column', 'Type', 'Description'],
    [
      ['id', 'INTEGER', 'PRIMARY KEY AUTOINCREMENT'],
      ['name', 'TEXT', 'Product name'],
      ['slug', 'TEXT', 'URL slug (UNIQUE)'],
      ['description', 'TEXT', 'Full description (HTML allowed)'],
      ['price', 'REAL', 'Current selling price'],
      ['original_price', 'REAL', 'Strikethrough / original price'],
      ['image', 'TEXT', 'Main product image path'],
      ['gallery', 'TEXT', 'JSON array of additional image paths'],
      ['rating', 'REAL', 'Star rating (1-5)'],
      ['categories', 'TEXT', 'Comma-separated category slugs'],
      ['is_featured', 'INTEGER', '1 = show on homepage'],
      ['is_highlighted', 'INTEGER', '1 = highlighted card style'],
      ['sku', 'TEXT', 'Stock keeping unit'],
      ['stock', 'INTEGER', 'Quantity in stock'],
      ['sort_order', 'INTEGER', 'Display order'],
      ['created_at', 'DATETIME', 'Creation timestamp']
    ],
    [20, 15, 65]
  ));

  // 4.5 posts
  mainChildren.push(heading('4.5 posts — Blog Posts', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Column', 'Type', 'Description'],
    [
      ['id', 'INTEGER', 'PRIMARY KEY AUTOINCREMENT'],
      ['title', 'TEXT', 'Blog post title'],
      ['slug', 'TEXT', 'URL slug (UNIQUE)'],
      ['content', 'TEXT', 'Full HTML content'],
      ['excerpt', 'TEXT', 'Short summary'],
      ['featured_image', 'TEXT', 'Image path'],
      ['author', 'TEXT', 'Author name'],
      ['status', 'TEXT', '"published" or "draft"'],
      ['published_at', 'DATETIME', 'Publish date'],
      ['created_at', 'DATETIME', 'Creation timestamp']
    ],
    [20, 15, 65]
  ));

  // Remaining tables (brief)
  mainChildren.push(heading('4.6 – 4.14 Additional Tables', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Table', 'Key Columns', 'Purpose'],
    [
      ['testimonials', 'id, quote, author_name, author_role, author_image, rating, sort_order', 'Customer reviews / testimonials'],
      ['faqs', 'id, question, answer, sort_order', 'Frequently asked questions'],
      ['hero_sections', 'id, badge_text, heading, description, cta_text, cta_link, background_image', 'Hero banner content'],
      ['offers', 'id, discount_text, title, description, image, cta_text, cta_link, sort_order', 'Best offer banners'],
      ['special_discounts', 'id, label, discount_text, description, image, sort_order', 'Special discount banners'],
      ['new_arrivals', 'id, title, image, link, sort_order', 'New arrival items'],
      ['brands', 'id, name, logo, sort_order', 'Brand logos'],
      ['social_links', 'id, platform, url, icon_class, sort_order', 'Social media links'],
      ['footer_links', 'id, group_name, label, url, sort_order', 'Footer navigation groups']
    ],
    [18, 50, 32]
  ));

  mainChildren.push(new Paragraph({ spacing: { after: 200 } }));
  mainChildren.push(heading('Entity Relationship Diagram', HeadingLevel.HEADING_2));
  mainChildren.push(addDiagram(findDiagram('er_diagram'), 580, 420));
  mainChildren.push(pageBreak());

  // === 5. API Endpoints ===
  mainChildren.push(heading('5. API Endpoints (All Routes)'));

  mainChildren.push(heading('5.1 Authentication Routes', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Method', 'Path', 'Description', 'Auth?'],
    [
      ['GET', '/admin/login', 'Show login form', 'No'],
      ['POST', '/admin/login', 'Process login (email + password)', 'No'],
      ['GET', '/admin/logout', 'Destroy session, redirect', 'Yes']
    ],
    [10, 25, 45, 20]
  ));

  mainChildren.push(heading('5.2 Products Management', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Method', 'Path', 'Description'],
    [
      ['GET', '/admin/products', 'List all products (with search/filter)'],
      ['GET', '/admin/products/create', 'Show "Add Product" form'],
      ['POST', '/admin/products/create', 'Save new product to DB'],
      ['GET', '/admin/products/:id/edit', 'Show "Edit Product" form'],
      ['POST', '/admin/products/:id/edit', 'Update product in DB'],
      ['POST', '/admin/products/:id/delete', 'Delete product']
    ],
    [10, 35, 55]
  ));

  mainChildren.push(heading('5.3 Categories Management', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Method', 'Path', 'Description'],
    [
      ['GET', '/admin/categories', 'List all categories'],
      ['GET', '/admin/categories/create', 'Show add form'],
      ['POST', '/admin/categories/create', 'Save new category'],
      ['GET', '/admin/categories/:id/edit', 'Show edit form'],
      ['POST', '/admin/categories/:id/edit', 'Update category'],
      ['POST', '/admin/categories/:id/delete', 'Delete category']
    ],
    [10, 35, 55]
  ));

  mainChildren.push(heading('5.4 Blog Posts Management', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Method', 'Path', 'Description'],
    [
      ['GET', '/admin/posts', 'List all blog posts'],
      ['GET', '/admin/posts/create', 'Show add form'],
      ['POST', '/admin/posts/create', 'Save new post'],
      ['GET', '/admin/posts/:id/edit', 'Show edit form'],
      ['POST', '/admin/posts/:id/edit', 'Update post'],
      ['POST', '/admin/posts/:id/delete', 'Delete post']
    ],
    [10, 35, 55]
  ));

  mainChildren.push(heading('5.5 Testimonials & FAQs', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Method', 'Path', 'Description'],
    [
      ['GET', '/admin/testimonials', 'List all testimonials'],
      ['POST', '/admin/testimonials/create', 'Save new testimonial'],
      ['POST', '/admin/testimonials/:id/edit', 'Update testimonial'],
      ['POST', '/admin/testimonials/:id/delete', 'Delete testimonial'],
      ['GET', '/admin/faqs', 'List all FAQs'],
      ['POST', '/admin/faqs/create', 'Save new FAQ'],
      ['POST', '/admin/faqs/:id/edit', 'Update FAQ'],
      ['POST', '/admin/faqs/:id/delete', 'Delete FAQ']
    ],
    [10, 35, 55]
  ));

  mainChildren.push(heading('5.6 Section & Footer Management', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Method', 'Path', 'Description'],
    [
      ['GET/POST', '/admin/sections/hero', 'Edit hero banner'],
      ['GET', '/admin/sections/offers', 'Manage offer banners'],
      ['POST', '/admin/sections/offers/create', 'Add new offer'],
      ['POST', '/admin/sections/offers/:id/delete', 'Delete offer'],
      ['GET', '/admin/sections/arrivals', 'Manage new arrivals'],
      ['GET', '/admin/sections/discounts', 'Manage special discounts'],
      ['GET', '/admin/sections/brands', 'Manage brand logos'],
      ['GET/POST', '/admin/footer', 'Edit footer link groups'],
      ['POST', '/admin/footer/social', 'Save social media links'],
      ['GET/POST', '/admin/settings', 'Edit site-wide settings']
    ],
    [12, 38, 50]
  ));

  mainChildren.push(heading('5.7 File Upload & Public Routes', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Method', 'Path', 'Description'],
    [
      ['POST', '/api/upload', 'Upload image/video, returns file path'],
      ['POST', '/api/reorder', 'Update sort_order for drag-and-drop'],
      ['GET', '/', 'Homepage — reads all sections from DB'],
      ['GET', '/products', 'Product listing — filterable by category'],
      ['GET', '/product/:slug', 'Single product page'],
      ['GET', '/blog', 'Blog listing page'],
      ['GET', '/blog/:slug', 'Single blog post'],
      ['GET', '/about', 'About page'],
      ['GET', '/contact', 'Contact page'],
      ['GET', '/cart', 'Cart page'],
      ['GET', '/checkout', 'Checkout page'],
      ['GET', '/faqs', 'FAQs page'],
      ['GET', '/testimonials', 'Testimonials page'],
      ['GET', '/privacy-policy', 'Privacy policy page'],
      ['GET', '/terms-conditions', 'Terms & conditions page']
    ],
    [10, 30, 60]
  ));
  mainChildren.push(pageBreak());

  // === 6. Authentication & Security ===
  mainChildren.push(heading('6. Authentication & Security'));
  mainChildren.push(heading('6.1 Login Flow', HeadingLevel.HEADING_2));
  mainChildren.push(para('The admin login follows a secure session-based authentication flow:'));
  mainChildren.push(addDiagram(findDiagram('login_flow'), 580, 400));

  mainChildren.push(heading('6.2 Security Measures', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Measure', 'Implementation'],
    [
      ['Password hashing', 'bcryptjs with 12 salt rounds'],
      ['Session security', 'httpOnly, secure (in production), sameSite: strict'],
      ['CSRF protection', 'Unique tokens embedded in forms'],
      ['Input sanitization', 'express-validator on all form inputs'],
      ['File upload validation', 'multer file-type filter (jpg, png, svg, webp, gif only)'],
      ['File size limit', 'Max 5 MB per upload'],
      ['SQL injection prevention', 'better-sqlite3 uses parameterized queries by default'],
      ['Rate limiting', 'Optional express-rate-limit on login endpoint']
    ],
    [25, 75]
  ));
  mainChildren.push(pageBreak());

  // === 7. Middleware Pipeline ===
  mainChildren.push(heading('7. Middleware Pipeline'));
  mainChildren.push(para('Every request passes through this middleware chain in order:'));
  mainChildren.push(addDiagram(findDiagram('middleware_pipeline'), 580, 300));

  mainChildren.push(makeTable(
    ['Order', 'Middleware', 'Purpose'],
    [
      ['1', 'express.static("public")', 'Serve CSS, JS, images, uploads'],
      ['2', 'express.urlencoded({ extended: true })', 'Parse form POST bodies'],
      ['3', 'express.json()', 'Parse JSON API requests'],
      ['4', 'express-session', 'Manage admin sessions'],
      ['5', 'connect-flash', 'Store flash messages between redirects'],
      ['6', 'Custom: injectGlobals', 'Load site settings from DB for all templates'],
      ['7', 'Custom: requireAuth', 'Protect /admin/* routes (except /admin/login)']
    ],
    [10, 40, 50]
  ));

  mainChildren.push(new Paragraph({ spacing: { after: 100 } }));
  mainChildren.push(boldPara('requireAuth Middleware:'));
  mainChildren.push(...multiLineCode([
    'function requireAuth(req, res, next) {',
    '    if (req.session && req.session.userId) {',
    '        return next();',
    '    }',
    '    req.flash("error", "Please log in to access the admin panel.");',
    '    res.redirect("/admin/login");',
    '}'
  ]));
  mainChildren.push(pageBreak());

  // === 8. Model Layer ===
  mainChildren.push(heading('8. Model Layer (Data Access)'));
  mainChildren.push(para('Each model file exports pure functions that interact with SQLite. No ORM — direct SQL for performance and simplicity.'));
  mainChildren.push(new Paragraph({ spacing: { after: 100 } }));
  mainChildren.push(makeTable(
    ['File', 'Entity', 'Key Functions'],
    [
      ['users.js', 'Admin accounts', 'findByEmail, create, verifyPassword'],
      ['settings.js', 'Site settings', 'get, update (single-row table)'],
      ['products.js', 'Products', 'getAll, getById, getBySlug, create, update, delete, getFeatured, count'],
      ['categories.js', 'Categories', 'getAll, getById, create, update, delete'],
      ['posts.js', 'Blog posts', 'getAll, getPublished, getBySlug, create, update, delete, count'],
      ['testimonials.js', 'Testimonials', 'getAll, create, update, delete'],
      ['faqs.js', 'FAQs', 'getAll, create, update, delete'],
      ['sections.js', 'Hero, offers, etc.', 'getHero, updateHero, getOffers, createOffer, deleteOffer, etc.'],
      ['footer.js', 'Footer content', 'getGroups, updateGroup, getSocialLinks, updateSocialLinks']
    ],
    [18, 18, 64]
  ));

  mainChildren.push(new Paragraph({ spacing: { after: 100 } }));
  mainChildren.push(boldPara('Example — products.js Model:'));
  mainChildren.push(...multiLineCode([
    'const db = require("../config/db");',
    '',
    'module.exports = {',
    '    getAll(filters = {}) {',
    '        let sql = "SELECT * FROM products";',
    '        const params = [];',
    '        if (filters.category) {',
    '            sql += " WHERE categories LIKE ?";',
    '            params.push(`%${filters.category}%`);',
    '        }',
    '        sql += " ORDER BY sort_order ASC, created_at DESC";',
    '        return db.prepare(sql).all(...params);',
    '    },',
    '',
    '    getById(id) {',
    '        return db.prepare("SELECT * FROM products WHERE id = ?").get(id);',
    '    },',
    '',
    '    create(data) { /* INSERT INTO products ... */ },',
    '    update(id, data) { /* UPDATE products SET ... WHERE id = ? */ },',
    '    delete(id) { /* DELETE FROM products WHERE id = ? */ },',
    '    count() { /* SELECT COUNT(*) ... */ },',
    '    getFeatured() { /* WHERE is_featured = 1 */ }',
    '};'
  ]));
  mainChildren.push(pageBreak());

  // === 9. File Upload Strategy ===
  mainChildren.push(heading('9. File Upload Strategy'));
  mainChildren.push(heading('9.1 Upload Flow', HeadingLevel.HEADING_2));
  mainChildren.push(addDiagram(findDiagram('upload_flow'), 450, 400));

  mainChildren.push(heading('9.2 Upload Directory Structure', HeadingLevel.HEADING_2));
  mainChildren.push(...multiLineCode([
    'public/uploads/',
    '├── products/        # Product images',
    '├── categories/      # Category images',
    '├── posts/           # Blog post featured images',
    '├── testimonials/    # Author avatars',
    '├── brands/          # Brand logos',
    '├── sections/        # Hero, offers, discount banner images',
    '└── general/         # Misc uploads (logo, favicon, etc.)'
  ]));

  mainChildren.push(heading('9.3 Multer Configuration', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Setting', 'Value'],
    [
      ['Storage', 'diskStorage — saves to public/uploads/ with unique timestamped filenames'],
      ['Allowed types', 'image/jpeg, image/png, image/svg+xml, image/webp, image/gif'],
      ['Max file size', '5 MB (5,242,880 bytes)'],
      ['Naming', 'timestamp + random number + original extension']
    ],
    [25, 75]
  ));
  mainChildren.push(pageBreak());

  // === 10. Data Seeding ===
  mainChildren.push(heading('10. Data Seeding'));
  mainChildren.push(para('On first run, server/seed.js parses the existing HTML template content and populates the database so the dynamic site looks identical to the original.'));
  mainChildren.push(addDiagram(findDiagram('seed_flow'), 450, 400));

  mainChildren.push(heading('10.1 Seed Data Summary', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Table', 'Source', 'Count'],
    [
      ['users', 'Hardcoded credentials', '1 admin user'],
      ['settings', 'index.html header/footer', '1 settings row'],
      ['categories', 'Categories section', '5 categories'],
      ['products', 'Products section', '8 featured products'],
      ['posts', 'Blog section', '3 blog posts'],
      ['testimonials', 'Testimonials section', '3 testimonials'],
      ['faqs', 'FAQ section', '5 FAQ items'],
      ['hero_sections', 'Hero section', '1 hero banner'],
      ['offers', 'Best Offers section', '3 offer banners'],
      ['special_discounts', 'Special Discount section', '3 discount banners'],
      ['new_arrivals', 'New Arrivals section', '4 arrival items'],
      ['brands', 'Brands section', '8 brand logos'],
      ['social_links', 'Footer', '4 social links'],
      ['footer_links', 'Footer', '3 link groups (12 links total)']
    ],
    [20, 40, 40]
  ));
  mainChildren.push(pageBreak());

  // === 11. Admin Panel UI ===
  mainChildren.push(heading('11. Admin Panel UI Architecture'));
  mainChildren.push(para('The admin panel uses a sidebar layout with EJS partials. All admin pages share a common layout with a dark sidebar, top navigation bar, and main content area.'));

  mainChildren.push(heading('11.1 Admin Sidebar Navigation', HeadingLevel.HEADING_2));
  mainChildren.push(makeTable(
    ['Icon', 'Menu Item', 'Route'],
    [
      ['📊', 'Dashboard', '/admin/dashboard'],
      ['📦', 'Products', '/admin/products'],
      ['📂', 'Categories', '/admin/categories'],
      ['📝', 'Blog Posts', '/admin/posts'],
      ['💬', 'Testimonials', '/admin/testimonials'],
      ['❓', 'FAQs', '/admin/faqs'],
      ['🖼️', 'Page Sections → Hero Banner', '/admin/sections/hero'],
      ['🖼️', 'Page Sections → Best Offers', '/admin/sections/offers'],
      ['🖼️', 'Page Sections → New Arrivals', '/admin/sections/arrivals'],
      ['🖼️', 'Page Sections → Special Discounts', '/admin/sections/discounts'],
      ['🖼️', 'Page Sections → Brand Logos', '/admin/sections/brands'],
      ['🔗', 'Footer', '/admin/footer'],
      ['⚙️', 'Settings', '/admin/settings'],
      ['🚪', 'Logout', '/admin/logout']
    ],
    [10, 45, 45]
  ));

  mainChildren.push(heading('11.2 View Template Structure', HeadingLevel.HEADING_2));
  mainChildren.push(...multiLineCode([
    'views/admin/',
    '├── layout.ejs          ← Master layout (sidebar + topbar + content area)',
    '├── login.ejs           ← Standalone login page',
    '├── dashboard.ejs       ← Stats cards + recent activity',
    '├── products/',
    '│   ├── index.ejs       ← Data table with search, filter',
    '│   └── form.ejs        ← Shared add/edit form',
    '├── categories/',
    '│   ├── index.ejs',
    '│   └── form.ejs',
    '├── posts/',
    '│   ├── index.ejs',
    '│   └── form.ejs',
    '├── testimonials/',
    '│   ├── index.ejs',
    '│   └── form.ejs',
    '├── faqs/',
    '│   ├── index.ejs',
    '│   └── form.ejs',
    '├── sections.ejs        ← Tabbed interface for hero, offers, etc.',
    '├── footer.ejs          ← Edit footer link groups + social links',
    '└── settings.ejs        ← Site title, logo, meta, topbar'
  ]));
  mainChildren.push(pageBreak());

  // === 12. Server Entry Point ===
  mainChildren.push(heading('12. Server Entry Point'));
  mainChildren.push(heading('12.1 Initialization Flow', HeadingLevel.HEADING_2));
  mainChildren.push(addDiagram(findDiagram('server_init_flow'), 400, 400));

  mainChildren.push(heading('12.2 app.js Pseudocode', HeadingLevel.HEADING_2));
  mainChildren.push(...multiLineCode([
    'require("dotenv").config();',
    'const express = require("express");',
    'const session = require("express-session");',
    'const flash = require("connect-flash");',
    'const path = require("path");',
    '',
    'const app = express();',
    '',
    '// View engine',
    'app.set("view engine", "ejs");',
    'app.set("views", path.join(__dirname, "../views"));',
    '',
    '// Static files',
    'app.use(express.static(path.join(__dirname, "../public")));',
    '',
    '// Body parsing, session, flash middleware...',
    '',
    '// Global template variables (settings, flash, auth status)',
    '',
    '// Routes',
    'app.use("/admin", require("./routes/admin"));',
    'app.use("/api", require("./routes/api"));',
    'app.use("/", require("./routes/site"));',
    '',
    '// Start',
    'const PORT = process.env.PORT || 3000;',
    'app.listen(PORT, () => {',
    '    console.log(`Server running at http://localhost:${PORT}`);',
    '    console.log(`Admin panel at http://localhost:${PORT}/admin`);',
    '});'
  ]));
  mainChildren.push(pageBreak());

  // === 13. Development Roadmap ===
  mainChildren.push(heading('13. Development Roadmap'));
  mainChildren.push(para('The implementation is divided into 4 phases, each building on the previous:'));
  mainChildren.push(addDiagram(findDiagram('development_roadmap'), 580, 380));

  mainChildren.push(new Paragraph({ spacing: { after: 100 } }));
  mainChildren.push(makeTable(
    ['Phase', 'Focus', 'Duration', 'Key Deliverables'],
    [
      ['Phase 1', 'Backend Foundation', '~5 days', 'Express app, SQLite schema, auth, seed data'],
      ['Phase 2', 'Admin CRUD', '~6 days', 'Dashboard, products, categories, posts, testimonials, FAQs'],
      ['Phase 3', 'Sections & Config', '~4 days', 'Hero, offers, discounts, brands, footer, settings'],
      ['Phase 4', 'Dynamic Public Site', '~5 days', 'Convert HTML to EJS, wire to DB, testing']
    ],
    [12, 22, 14, 52]
  ));
  mainChildren.push(pageBreak());

  // === 14. Environment Config ===
  mainChildren.push(heading('14. Environment Configuration'));
  mainChildren.push(boldPara('.env File:'));
  mainChildren.push(...multiLineCode([
    '# Server',
    'PORT=3000',
    'NODE_ENV=development',
    '',
    '# Session',
    'SESSION_SECRET=saint-roman-super-secret-key-change-me-in-production',
    '',
    '# Default Admin (used only during first seed)',
    'ADMIN_NAME=Admin',
    'ADMIN_EMAIL=admin@saintroman.com',
    'ADMIN_PASSWORD=admin123',
    '',
    '# Upload',
    'MAX_FILE_SIZE=5242880',
    'UPLOAD_DIR=public/uploads'
  ]));
  mainChildren.push(pageBreak());

  // === 15. Summary ===
  mainChildren.push(heading('15. Summary & Metrics'));
  mainChildren.push(makeTable(
    ['Metric', 'Value'],
    [
      ['Total database tables', '14'],
      ['Total API routes', '40+'],
      ['Admin panel pages', '15+'],
      ['Public site pages', '15+'],
      ['npm dependencies', '10 (production) + 1 (dev)'],
      ['Estimated development', '~15-20 days (4 phases)'],
      ['Database size (initial)', '~50 KB (saint-roman.db)'],
      ['External services required', 'None — everything runs locally'],
      ['Default admin credentials', 'admin@saintroman.com / admin123'],
      ['Server command', 'npm start or node server/app.js']
    ],
    [35, 65]
  ));

  mainChildren.push(new Paragraph({ spacing: { after: 200 } }));
  mainChildren.push(para('This architecture is designed to be simple, maintainable, and self-contained. No Docker, no cloud services, no external databases. Just run npm start and everything works.', { italics: true, color: DARK_GRAY }));

  sections.push({
    properties: {},
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: 'Saint Roman Admin Panel — Backend Architecture Report', size: 16, font: 'Calibri', color: '999999', italics: true })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'Page ', size: 16, font: 'Calibri', color: '999999' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 16, font: 'Calibri', color: '999999' })
          ]
        })]
      })
    },
    children: mainChildren
  });

  // ===================== GENERATE FILE =====================
  const doc = new Document({
    creator: 'Saint Roman Admin Panel',
    title: 'Backend Architecture Report',
    description: 'Complete backend architecture documentation for Saint Roman Admin Panel',
    sections
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(
    'c:\\Users\\DELL-G3 15-3500\\Downloads\\themeforest-erJI4BDo-ellora-fashion-lifestyle-store-html-template',
    'Saint_Roman_Backend_Architecture_Report.docx'
  );
  fs.writeFileSync(outputPath, buffer);
  console.log(`\n✅ Report generated successfully!`);
  console.log(`📄 File: ${outputPath}`);
  console.log(`📊 Includes 8 diagrams, 14 database schemas, 40+ API endpoints`);
}

generateReport().catch(err => {
  console.error('Error generating report:', err);
  process.exit(1);
});
