export const CHAPTERS = [
  {
    key: "contentBab1",
    label: "Bab I",
    longLabel: "Bab I - Pendahuluan",
    placeholder: "Tulis latar belakang, rumusan masalah, tujuan, dan manfaat penelitian...",
  },
  {
    key: "contentBab2",
    label: "Bab II",
    longLabel: "Bab II - Kajian Pustaka",
    placeholder: "Tulis tinjauan teori, penelitian terdahulu, dan kerangka berpikir...",
  },
  {
    key: "contentBab3",
    label: "Bab III",
    longLabel: "Bab III - Metode Penelitian",
    placeholder: "Jelaskan jenis, setting, populasi, teknik pengambilan data, dan instrumen...",
  },
  {
    key: "contentBab4",
    label: "Bab IV",
    longLabel: "Bab IV - Hasil dan Pembahasan",
    placeholder: "Paparkan data, analisis, dan pembahasan temuan penelitian...",
  },
  {
    key: "contentBab5",
    label: "Bab V",
    longLabel: "Bab V - Kesimpulan dan Saran",
    placeholder: "Tuliskan kesimpulan akhir dan saran yang dapat ditindaklanjuti...",
  },
];

export const JURNAL_IMRAD_TEMPLATE = [
  { key: "sec_1", label: "Pendahuluan", promptContext: "Berisi latar belakang masalah, perumusan masalah, tujuan penelitian, dan urgensi penelitian." },
  { key: "sec_2", label: "Kajian Pustaka", promptContext: "Kajian pustaka, teori yang digunakan, penelitian terdahulu, dan kerangka berpikir." },
  { key: "sec_3", label: "Metode Penelitian", promptContext: "Rancangan penelitian, teknik pengumpulan data, populasi dan sampel, serta teknik analisis data." },
  { key: "sec_4", label: "Hasil dan Pembahasan", promptContext: "Pemaparan hasil analisis data dan pembahasan yang mengaitkan hasil dengan teori/hipotesis." },
  { key: "sec_5", label: "Kesimpulan", promptContext: "Ringkasan temuan utama, implikasi, dan saran untuk penelitian selanjutnya." }
];

export const WORKSPACE_TABS = [
  { key: "penulisan", label: "Penulisan", icon: "squarePen" },
  { key: "referensi", label: "Referensi", icon: "bookMarked" },
  { key: "data", label: "Data", icon: "database" },
  { key: "analisis", label: "Analisis", icon: "barChart3" },
];

export const WORKSPACE_DEFAULTS = {
  methodologyType: "kuantitatif",
  activeChapter: 0,
  progress: 0,
  activeFormId: null,
  referenceCount: 0,
  responseCount: 0,
  lastAnalysisAt: null,
};

export const FORM_STATUSES = {
  draft: "draft",
  published: "published",
  archived: "archived",
};

export const BUILDER_QUESTION_TYPES = [
  { value: "sectionText", label: "Teks Bagian" },
  { value: "shortText", label: "Isian Singkat" },
  { value: "paragraph", label: "Paragraf" },
  { value: "singleChoice", label: "Pilihan Tunggal" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "number", label: "Angka" },
  { value: "likert5", label: "Skala Likert 1-5" },
];

export function createId(prefix = "id") {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return `${prefix}_${globalThis.crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function slugify(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

export function stripHtml(html = "") {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function calculateWorkspaceProgress(contentSource = {}, workspaceType = "skripsi", journalSections = []) {
  if (workspaceType === "jurnal" && Array.isArray(journalSections) && journalSections.length > 0) {
    const completed = journalSections.filter((section) => stripHtml(contentSource[section.key] || "").length >= 120).length;
    return Math.round((completed / journalSections.length) * 100);
  }

  const completed = CHAPTERS.filter((chapter) => stripHtml(contentSource[chapter.key] || "").length >= 120).length;
  return Math.round((completed / CHAPTERS.length) * 100);
}

export function createWorkspacePayload({ userId, type = "skripsi", title, topic }) {
  return {
    userId,
    type,
    title,
    topic,
    status: "Draft",
    contentBab1: "",
    contentBab2: "",
    contentBab3: "",
    contentBab4: "",
    contentBab5: "",
    ...WORKSPACE_DEFAULTS,
  };
}

export function createQuestion(type = "shortText", overrides = {}) {
  const base = {
    id: createId("question"),
    variableKey: createId("item").replace(/[^a-z0-9_]/g, "_").slice(0, 18),
    label: "Pertanyaan baru",
    type,
    required: true,
    helpText: "",
    options: [],
    scale: null,
    visibilityRule: null,
  };

  switch (type) {
    case "singleChoice":
    case "dropdown":
    case "checkbox":
      base.options = ["Pilihan 1", "Pilihan 2"];
      break;
    case "number":
      base.label = "Masukkan angka";
      break;
    case "paragraph":
      base.label = "Tuliskan jawaban Anda";
      break;
    case "likert5":
      base.label = "Pilih skala yang paling sesuai";
      base.scale = {
        min: 1,
        max: 5,
        minLabel: "Sangat Tidak Setuju",
        maxLabel: "Sangat Setuju",
      };
      break;
    case "sectionText":
      base.required = false;
      base.label = "Catatan bagian";
      break;
    default:
      break;
  }

  return { ...base, ...overrides };
}

export function createSection(title = "Bagian Baru", description = "", questions = [createQuestion("shortText")], overrides = {}) {
  return {
    id: createId("section"),
    title,
    description,
    questions,
    ...overrides,
  };
}

export function createEmptyForm(overrides = {}) {
  return {
    id: createId("form"),
    title: "Instrumen Penelitian",
    description: "Lengkapi identitas dan jawaban responden sesuai kondisi penelitian.",
    status: FORM_STATUSES.draft,
    publicSlug: "",
    settings: {
      allowMultipleSubmissions: true,
      showProgress: true,
      thankYouMessage: "Terima kasih, tanggapan Anda telah terekam.",
    },
    sections: [
      createSection("Identitas Responden", "Bagian pembuka untuk mengenali profil responden.", [
        createQuestion("shortText", { label: "Nama Responden", variableKey: "nama_responden" }),
        createQuestion("dropdown", {
          label: "Program Studi",
          variableKey: "program_studi",
          options: ["Manajemen", "Akuntansi", "Teknik Informatika"],
        }),
      ]),
    ],
    publishedAt: null,
    updatedAt: null,
    ...overrides,
  };
}

export const FORM_QUICK_TEMPLATES = [
  {
    key: "identitas",
    label: "Identitas Responden",
    build: () =>
      createSection("Identitas Responden", "Isi informasi dasar responden terlebih dahulu.", [
        createQuestion("shortText", { label: "Nama Lengkap", variableKey: "nama_lengkap" }),
        createQuestion("number", { label: "Usia", variableKey: "usia" }),
        createQuestion("dropdown", {
          label: "Jenis Kelamin",
          variableKey: "jenis_kelamin",
          options: ["Laki-laki", "Perempuan"],
        }),
      ]),
  },
  {
    key: "variabel_x",
    label: "Variabel X",
    build: () =>
      createSection("Variabel X", "Butir untuk konstruk variabel bebas.", [
        createQuestion("likert5", { label: "X1 - Pernyataan pertama", variableKey: "x1" }),
        createQuestion("likert5", { label: "X2 - Pernyataan kedua", variableKey: "x2" }),
        createQuestion("likert5", { label: "X3 - Pernyataan ketiga", variableKey: "x3" }),
      ]),
  },
  {
    key: "variabel_y",
    label: "Variabel Y",
    build: () =>
      createSection("Variabel Y", "Butir untuk konstruk variabel terikat.", [
        createQuestion("likert5", { label: "Y1 - Pernyataan pertama", variableKey: "y1" }),
        createQuestion("likert5", { label: "Y2 - Pernyataan kedua", variableKey: "y2" }),
        createQuestion("likert5", { label: "Y3 - Pernyataan ketiga", variableKey: "y3" }),
      ]),
  },
  {
    key: "likert",
    label: "Skala Likert",
    build: () =>
      createSection("Skala Sikap", "Gunakan skala 1-5 untuk mengukur persetujuan responden.", [
        createQuestion("likert5", { label: "Saya merasa layanan ini membantu.", variableKey: "likert_1" }),
      ]),
  },
  {
    key: "terbuka",
    label: "Pertanyaan Terbuka",
    build: () =>
      createSection("Pertanyaan Terbuka", "Berikan ruang jawaban naratif untuk wawasan tambahan.", [
        createQuestion("paragraph", {
          label: "Apa masukan utama Anda terkait topik penelitian ini?",
          variableKey: "masukan_utama",
          required: false,
        }),
      ]),
  },
];

export function addTemplateSection(form, templateKey) {
  const template = FORM_QUICK_TEMPLATES.find((item) => item.key === templateKey);
  if (!template) return form;
  return {
    ...form,
    sections: [...(form.sections || []), template.build()],
  };
}

export function flattenFormQuestions(form = null) {
  if (!form?.sections?.length) return [];
  return form.sections.flatMap((section) =>
    (section.questions || []).map((question) => ({
      ...question,
      sectionId: section.id,
      sectionTitle: section.title,
    }))
  );
}

export function getQuestionById(form, questionId) {
  return flattenFormQuestions(form).find((question) => question.id === questionId) || null;
}

export function getQuestionLabelMap(form = null) {
  return flattenFormQuestions(form).reduce((acc, question) => {
    acc[question.id] = {
      label: question.label,
      variableKey: question.variableKey,
      type: question.type,
      options: question.options || [],
      scale: question.scale || null,
      sectionTitle: question.sectionTitle,
    };
    return acc;
  }, {});
}

export function isQuestionVisible(question, answers = {}) {
  if (!question?.visibilityRule?.questionId || !question?.visibilityRule?.operator) {
    return true;
  }

  const currentValue = answers[question.visibilityRule.questionId];
  const expectedValue = question.visibilityRule.value;

  switch (question.visibilityRule.operator) {
    case "equals":
      return currentValue === expectedValue;
    case "not_equals":
      return currentValue !== expectedValue;
    case "includes":
      return Array.isArray(currentValue) && currentValue.includes(expectedValue);
    default:
      return true;
  }
}

export function duplicateSection(section) {
  return {
    ...section,
    id: createId("section"),
    title: `${section.title} (Salinan)`,
    questions: (section.questions || []).map((question) => ({
      ...question,
      id: createId("question"),
    })),
  };
}

export function duplicateQuestion(question) {
  return {
    ...question,
    id: createId("question"),
    variableKey: `${question.variableKey || "item"}_copy`,
    label: `${question.label} (Salinan)`,
  };
}

export function summarizeTranscriptThemes(transcripts = []) {
  if (!transcripts.length) return "";

  return transcripts
    .slice(0, 8)
    .map((item, index) => {
      const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean).join(", ") : "";
      return `${index + 1}. ${item.title || "Informan"}${item.role ? ` (${item.role})` : ""}${tags ? ` [tema: ${tags}]` : ""}\n${(item.excerpt || item.content || "").trim().slice(0, 400)}`;
    })
    .join("\n\n");
}

export function buildPublicFormSnapshot(form, workspaceId, formId, ownerId = null) {
  return {
    ownerId,
    workspaceId,
    formId,
    title: form.title,
    description: form.description,
    status: form.status,
    publicSlug: form.publicSlug,
    settings: form.settings || {},
    sections: form.sections || [],
    publishedAt: form.publishedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
