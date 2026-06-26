/* schema.js — CORE_SCHEMAS + getFullSchema() */

export const CORE_SCHEMAS = {
  characters: {
    required: ['name', 'roleImportance', 'roleAlignment'],
    alwaysShown: [
      { id: 'name',          label: 'Tên nhân vật',     type: 'text',      required: true },
      { id: 'roleImportance',label: 'Tầm quan trọng',   type: 'multi-tag',
        options: ['Nhân vật chính', 'Nhân vật phụ', 'Nhân vật quần chúng'],
        optionHints: {
          'Nhân vật chính':      'Vai trò quan trọng xuyên suốt cốt truyện',
          'Nhân vật phụ':        'Xuất hiện nhiều xuyên suốt câu chuyện, giữ vai trò trung bình',
          'Nhân vật quần chúng': 'Gần như chỉ xuất hiện trong 1-2 sự kiện, không gây xáo trộn lớn hay quyết định diễn biến truyện'
        },
        required: true },
      { id: 'roleAlignment', label: 'Phe / Tính cách',  type: 'multi-tag', options: ['Chính diện', 'Phản diện', 'Trung lập'], required: true },
      { id: 'avatar',        label: 'Ảnh đại diện',     type: 'image' },
      { id: 'gender',        label: 'Giới tính',        type: 'select',    options: ['Nam', 'Nữ', 'Khác'] },
      { id: 'age',           label: 'Tuổi',             type: 'text' },
      { id: 'personality',   label: 'Tính cách',        type: 'textarea' },
      { id: 'relations',     label: 'Mối quan hệ',      type: 'reference', refModule: 'characters' }
    ],
    optional: [
      { id: 'origin',      label: 'Xuất thân',            type: 'text' },
      { id: 'appearance',  label: 'Ngoại hình',           type: 'textarea' },
      { id: 'goal',        label: 'Mục tiêu / Động lực', type: 'textarea' },
      { id: 'backstory',   label: 'Backstory',            type: 'textarea' },
      { id: 'notes',       label: 'Ghi chú riêng',       type: 'richtext' }
    ]
  },

  plot: [
    { id: 'author',      label: 'Tác giả',                  type: 'text' },
    { id: 'title',       label: 'Tiêu đề tác phẩm',        type: 'text' },
    { id: 'genreTagline',label: 'Thể loại & Tagline',       type: 'text' },
    { id: 'summary',     label: 'Tóm tắt / Logline',       type: 'textarea' },
    { id: 'theme',       label: 'Chủ đề chính',             type: 'text' },
    { id: 'message',     label: 'Thông điệp muốn truyền tải', type: 'textarea' }
  ],

  storylines: [
    { id: 'title',              label: 'Tên storyline',        type: 'text',      required: true },
    { id: 'summary',            label: 'Tóm tắt arc này',     type: 'textarea' },
    { id: 'involvedCharacters', label: 'Nhân vật tham gia',   type: 'reference', refModule: 'characters', noteLabel: 'Vai trò trong arc' },
    { id: 'relatedEvents',      label: 'Sự kiện liên quan',   type: 'reference', refModule: 'events' },
    { id: 'relatedStorylines',  label: 'Storyline liên kết',  type: 'reference', refModule: 'storylines', noteLabel: 'Ghi chú liên kết', bidirectional: true }
  ],

  worlds: [
    { id: 'title',       label: 'Tên thế giới',               type: 'text',     required: true },
    { id: 'spacetime',   label: 'Thời đại & Địa điểm',       type: 'text' },
    { id: 'desc',        label: 'Mô tả thế giới',            type: 'textarea' },
    { id: 'environment', label: 'Môi trường & Địa lý',       type: 'textarea' },
    { id: 'politics',    label: 'Chính trị',                  type: 'textarea' },
    { id: 'society',     label: 'Xã hội & Văn hóa',          type: 'textarea' },
    { id: 'exception',   label: 'Ngoại lệ / Quy tắc đặc biệt', type: 'textarea' },
    { id: 'history',     label: 'Lịch sử',                   type: 'textarea' },
    { id: 'notes',       label: 'Ghi chú thêm',              type: 'textarea' }
  ],

  chapters: [
    { id: 'eventId',  label: 'Thuộc sự kiện',     type: 'ref-single', refModule: 'events' },
    { id: 'title',    label: 'Tiêu đề chương',    type: 'text' },
    { id: 'summary',  label: 'Tóm tắt nội dung',  type: 'textarea' },
    { id: 'chars',    label: 'Nhân vật xuất hiện', type: 'reference', refModule: 'characters' },
    { id: 'place',    label: 'Địa điểm',           type: 'text' },
    { id: 'goal',     label: 'Mục tiêu chương',    type: 'textarea' },
    { id: 'notes',    label: 'Ghi chú / Ý tưởng', type: 'textarea' }
  ],

  events: [
    { id: 'title',           label: 'Tiêu đề sự kiện',            type: 'text',    required: true },
    { id: 'isFlashback',     label: 'Flashback / Phi tuyến tính', type: 'boolean' },
    { id: 'severity',        label: 'Mức độ quan trọng',          type: 'select',  options: ['Cao', 'Trung bình', 'Thấp'] },
    { id: 'time',            label: 'Thời điểm (mô tả)',          type: 'text' },
    { id: 'desc',            label: 'Mô tả chi tiết',             type: 'textarea' },
    { id: 'chars',           label: 'Nhân vật liên quan',         type: 'reference', refModule: 'characters' }
  ],

  notes: [
    { id: 'title',   label: 'Tiêu đề',  type: 'text' },
    { id: 'content', label: 'Nội dung', type: 'textarea' },
    { id: 'tags',    label: 'Tags',     type: 'tags' }
  ],

  sources: [
    { id: 'title', label: 'Tiêu đề *', type: 'text',   required: true },
    { id: 'type',  label: 'Loại',      type: 'select', options: ['Link web', 'Sách', 'Bài báo', 'Video', 'Khác'] },
    { id: 'url',   label: 'Link URL',  type: 'url' },
    { id: 'notes', label: 'Ghi chú',   type: 'textarea' }
  ]
};

/**
 * Returns { coreFields, customFields } for a given module.
 * For characters, coreFields = alwaysShown + optional fields whose ids are in visibleOptionalIds.
 */
export function getFullSchema(moduleName, db, visibleOptionalIds = []) {
  const schema = CORE_SCHEMAS[moduleName];
  const customFields = db?.schemas?.[moduleName]?.customFields || [];

  if (moduleName === 'characters') {
    const shown = [...schema.alwaysShown];
    for (const f of schema.optional) {
      if (visibleOptionalIds.includes(f.id)) shown.push(f);
    }
    return { coreFields: shown, customFields, optional: schema.optional };
  }

  const coreFields = Array.isArray(schema) ? schema : [];
  return { coreFields, customFields };
}

export function getCharOptionalFields() {
  return CORE_SCHEMAS.characters.optional;
}
