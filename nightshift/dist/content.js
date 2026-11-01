export const STORAGE_KEY = 'nightshift.content.v1';
export function safeUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}
function text(value, max, label, required = false) {
  if (typeof value !== 'string') throw new Error(`${label}必须是文字。`);
  const result = value.trim();
  if (result.length > max) throw new Error(`${label}最多 ${max} 个字符。`);
  if (required && !result) throw new Error(`请填写${label}。`);
  return result;
}
function url(value, label) {
  const result = text(value ?? '', 1000, label);
  if (result && !safeUrl(result)) throw new Error(`${label}请使用完整的 http:// 或 https:// 链接。`);
  return result;
}
function tags(value, label) {
  if (!Array.isArray(value) || value.length > 16) throw new Error(`${label}最多 16 项。`);
  return [...new Set(value.map(item => text(item, 40, label)).filter(Boolean))];
}
export function normalizeContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1) throw new Error('请选择本站导出的 version: 1 JSON 资料。');
  const p = input.profile;
  if (!p || typeof p !== 'object') throw new Error('资料中缺少 profile。');
  const profile = {};
  for (const [key, max, label, required] of [
    ['name',60,'姓名',true],['englishName',80,'英文名'],['role',120,'身份方向'],
    ['headline',120,'首屏标题',true],['intro',500,'简短介绍'],['about',8000,'个人介绍'],
    ['location',80,'位置'],['availability',120,'交流状态'],['email',180,'邮箱']
  ]) profile[key] = text(p[key] ?? '', max, label, required);
  if (profile.email && !/^[^\s@<>?&#:]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(profile.email)) throw new Error('请填写有效的联系邮箱。');
  profile.github = url(p.github, 'GitHub'); profile.social = url(p.social, '个人链接');
  profile.skills = tags(p.skills ?? [], '关键词');
  if (!Array.isArray(input.projects) || input.projects.length > 30) throw new Error('项目列表最多 30 项。');
  const ids = new Set();
  const projects = input.projects.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`项目 ${index + 1} 格式错误。`);
    const id = text(item.id ?? `project-${index + 1}`, 80, '项目编号', true);
    if (ids.has(id)) throw new Error('项目编号不能重复。'); ids.add(id);
    return { id, title:text(item.title,120,'项目标题',true), category:text(item.category ?? '项目',60,'项目分类',true),
      year:text(item.year ?? '',30,'项目时间'), summary:text(item.summary ?? '',500,'项目简述'),
      description:text(item.description ?? '',12000,'项目详情'), tags:tags(item.tags ?? [],'项目标签'),
      url:url(item.url,'项目链接'), visual:['orb','terrain','portal'].includes(item.visual) ? item.visual : 'orb' };
  });
  if (!Array.isArray(input.notes ?? []) || (input.notes ?? []).length > 50) throw new Error('文章列表最多 50 项。');
  const notes = (input.notes ?? []).map(item => {
    if (!item || typeof item !== 'object') throw new Error('文章格式错误。');
    const date = text(item.date ?? '',10,'文章日期');
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) throw new Error('文章日期请使用 YYYY-MM-DD 格式。');
    return { title:text(item.title,160,'文章标题',true), date, body:text(item.body ?? '',16000,'文章正文'), url:url(item.url,'文章链接') };
  });
  return { version:1, profile, projects, notes };
}
