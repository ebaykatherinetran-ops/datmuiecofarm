/**
 * build-posts.js
 * Chạy tự động khi Netlify deploy
 * Đọc tất cả file .md trong _posts/ → xuất ra posts.json
 */

const fs   = require('fs');
const path = require('path');

const POSTS_DIR  = path.join(__dirname, '_posts');
const OUTPUT     = path.join(__dirname, 'posts.json');

// Parse front matter từ file .md
function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const frontMatter = match[1];
  const body        = match[2].trim();
  const data        = {};

  // Parse từng dòng key: value
  frontMatter.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key   = line.slice(0, colonIdx).trim();
    let   value = line.slice(colonIdx + 1).trim();
    // Bỏ dấu nháy đầu cuối
    value = value.replace(/^["']|["']$/g, '');
    // Parse object lồng nhau (seo.title, seo.description)
    if (key && value) data[key] = value;
  });

  // Parse SEO block (multi-line object)
  const seoMatch = frontMatter.match(/seo:\s*\n((?:\s+\w+:.*\n?)*)/);
  if (seoMatch) {
    data.seo = {};
    seoMatch[1].split('\n').forEach(line => {
      const m = line.match(/^\s+(\w+):\s*(.+)/);
      if (m) data.seo[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  }

  return { data, body };
}

// Tạo slug từ tên file
function fileToSlug(filename) {
  // Format: YYYY-MM-DD-ten-bai-viet.md
  return filename
    .replace(/\.md$/, '')
    .replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

// Format ngày đẹp hơn
function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
  } catch(e) {
    return dateStr;
  }
}

// Main
function build() {
  console.log('📝 Building posts.json...');

  if (!fs.existsSync(POSTS_DIR)) {
    console.log('⚠️  _posts/ folder not found. Creating empty posts.json');
    fs.writeFileSync(OUTPUT, '[]', 'utf8');
    return;
  }

  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .reverse(); // Mới nhất lên đầu

  const posts = files.map(filename => {
    const content       = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
    const { data, body } = parseFrontMatter(content);
    const slug          = data.slug || fileToSlug(filename);

    return {
      slug,
      title:          data.title          || 'Bài viết',
      date:           formatDate(data.date) || '',
      date_raw:       data.date            || '',
      featured_image: data.featured_image  || '',
      summary:        data.summary         || '',
      category:       data.category        || 'tin-tuc',
      seo:            data.seo             || {},
      body,
    };
  });

  fs.writeFileSync(OUTPUT, JSON.stringify(posts, null, 2), 'utf8');
  console.log(`✅ posts.json created with ${posts.length} post(s)`);
  posts.forEach(p => console.log(`   - ${p.slug}: ${p.title}`));
}

build();
