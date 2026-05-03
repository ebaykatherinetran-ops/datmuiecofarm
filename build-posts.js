/**
 * build-posts.js
 * Chạy tự động khi Cloudflare Pages / Netlify deploy
 * - Đọc _posts/*.md → xuất posts.json
 * - Đọc _gallery/*.md → xuất gallery.json
 */

const fs   = require('fs');
const path = require('path');

// ──────────────────────────────────────────────
function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: content };

  const frontMatter = match[1];
  const body        = match[2].trim();
  const data        = {};

  frontMatter.split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key   = line.slice(0, colonIdx).trim();
    let   value = line.slice(colonIdx + 1).trim();
    value = value.replace(/^["']|["']$/g, '');
    if (key && value) data[key] = value;
  });

  // Parse boolean
  Object.keys(data).forEach(k => {
    if (data[k] === 'true')  data[k] = true;
    if (data[k] === 'false') data[k] = false;
  });

  // Parse SEO block
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

function fileToSlug(filename) {
  return filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch(e) { return dateStr; }
}

// ─── BUILD POSTS ─────────────────────────────
function buildPosts() {
  const POSTS_DIR = path.join(__dirname, '_posts');
  const OUTPUT    = path.join(__dirname, 'posts.json');

  if (!fs.existsSync(POSTS_DIR)) {
    fs.writeFileSync(OUTPUT, '[]', 'utf8');
    console.log('⚠️  _posts/ not found → posts.json = []');
    return;
  }

  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort().reverse();

  const posts = files.map(filename => {
    const content        = fs.readFileSync(path.join(POSTS_DIR, filename), 'utf8');
    const { data, body } = parseFrontMatter(content);
    const slug           = data.slug || fileToSlug(filename);
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
  console.log(`✅ posts.json: ${posts.length} bài viết`);
  posts.forEach(p => console.log(`   · ${p.slug}`));
}

// ─── BUILD GALLERY ────────────────────────────
function buildGallery() {
  const GAL_DIR = path.join(__dirname, '_gallery');
  const OUTPUT  = path.join(__dirname, 'gallery.json');

  if (!fs.existsSync(GAL_DIR)) {
    fs.writeFileSync(OUTPUT, '[]', 'utf8');
    console.log('⚠️  _gallery/ not found → gallery.json = []');
    return;
  }

  const files = fs.readdirSync(GAL_DIR)
    .filter(f => f.endsWith('.md'))
    .sort().reverse(); // Mới nhất lên đầu

  const photos = files.map(filename => {
    const content        = fs.readFileSync(path.join(GAL_DIR, filename), 'utf8');
    const { data }       = parseFrontMatter(content);
    return {
      title:    data.title    || '',
      date:     data.date     || '',
      date_fmt: formatDate(data.date) || '',
      image:    data.image    || '',
      caption:  data.caption  || data.title || '',
      category: data.category || 'vuon',
      featured: data.featured === true || data.featured === 'true',
    };
  });

  // Ảnh featured lên đầu
  photos.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  fs.writeFileSync(OUTPUT, JSON.stringify(photos, null, 2), 'utf8');
  console.log(`✅ gallery.json: ${photos.length} ảnh`);
  photos.forEach(p => console.log(`   · [${p.featured ? '⭐' : ' '}] ${p.title || p.image}`));
}

// ─── RUN ─────────────────────────────────────
console.log('\n📝 Building posts.json...');
buildPosts();

console.log('\n🖼️  Building gallery.json...');
buildGallery();

console.log('\n✅ Build complete!\n');
