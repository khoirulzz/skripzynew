import { FormTemplate } from './types';

export const emptyTemplate: FormTemplate = {
  id: 'blank',
  title: 'Formulir Tanpa Judul',
  description: '',
  targetRespondents: 100,
  themeColor: 'indigo',
  sections: [
    {
      id: `s_id_blank`,
      name: 'Identitas Responden',
      type: 'identity',
      items: [{ id: `q_id_name`, text: 'Nama Lengkap', type: 'text' }]
    }
  ]
};

export const academicTemplates: FormTemplate[] = [
  {
    id: 'tpl_likert_5',
    title: 'Penelitian Bivariat (Skala Likert 5 Poin)',
    description: 'Format standar angket penelitian dengan 1 Variabel Independen (X) dan 1 Variabel Dependen (Y) menggunakan skala Likert 1-5 (Sangat Tidak Setuju - Sangat Setuju).',
    targetRespondents: 100,
    themeColor: 'indigo',
    sections: [
      {
        id: 's_info',
        name: 'Informasi Kelayakan',
        type: 'info',
        items: [
          { id: 'q_info', text: 'Tujuan Penelitian', description: 'Kuesioner ini dirancang untuk penelitian akademis. Semua jawaban yang diberikan akan dijaga kerahasiaannya.', type: 'info' }
        ]
      },
      {
        id: 's_id',
        name: 'Karakteristik Responden',
        type: 'identity',
        items: [
          { id: 'q_nama', text: 'Inisial / Nama', type: 'text' },
          { id: 'q_gender', text: 'Jenis Kelamin', type: 'choice', options: ['Laki-laki', 'Perempuan'] },
          { id: 'q_usia', text: 'Usia', type: 'choice', options: ['< 20 Tahun', '20 - 30 Tahun', '> 30 Tahun'] }
        ]
      },
      {
        id: 's_varx',
        name: 'Variabel Independen (X)',
        type: 'variable',
        items: [
          { id: 'qx_1', text: 'Pernyataan 1', type: 'likert', scale: 5 },
          { id: 'qx_2', text: 'Pernyataan 2', type: 'likert', scale: 5 },
          { id: 'qx_3', text: 'Pernyataan 3', type: 'likert', scale: 5 },
        ]
      },
      {
        id: 's_vary',
        name: 'Variabel Dependen (Y)',
        type: 'variable',
        items: [
          { id: 'qy_1', text: 'Pernyataan 1', type: 'likert', scale: 5 },
          { id: 'qy_2', text: 'Pernyataan 2', type: 'likert', scale: 5 },
          { id: 'qy_3', text: 'Pernyataan 3', type: 'likert', scale: 5 },
        ]
      }
    ]
  },
  {
    id: 'tpl_likert_4',
    title: 'Penelitian Bivariat (Skala Likert 4 Poin)',
    description: 'Format penelitian dengan Likert 1-4 (menghindari jawaban netral). Sangat cocok untuk mengukur sikap atau nilai subjektif secara tegas.',
    targetRespondents: 100,
    themeColor: 'emerald',
    sections: [
      {
        id: 's_info2',
        name: 'Persetujuan (Informed Consent)',
        type: 'info',
        items: [
          { id: 'q_info2', text: 'Pernyataan Persetujuan', description: 'Dengan mengisi kuesioner ini, Anda setuju data Anda digunakan sebagai bagian dari analisis penelitian.', type: 'info' }
        ]
      },
      {
        id: 's_id2',
        name: 'Deskripsi Diri',
        type: 'identity',
        items: [
          { id: 'q_nama2', text: 'Inisial', type: 'text' },
        ]
      },
      {
        id: 's_varx2',
        name: 'Variabel X',
        type: 'variable',
        items: [
          { id: 'qx2_1', text: 'Pertanyaan 1', type: 'likert', scale: 4 },
          { id: 'qx2_2', text: 'Pertanyaan 2', type: 'likert', scale: 4 },
          { id: 'qx2_3', text: 'Pertanyaan 3', type: 'likert', scale: 4 },
        ]
      },
      {
        id: 's_vary2',
        name: 'Variabel Y',
        type: 'variable',
        items: [
          { id: 'qy2_1', text: 'Pertanyaan 1', type: 'likert', scale: 4 },
          { id: 'qy2_2', text: 'Pertanyaan 2', type: 'likert', scale: 4 },
          { id: 'qy2_3', text: 'Pertanyaan 3', type: 'likert', scale: 4 },
        ]
      }
    ]
  },
  {
    id: 'tpl_multi',
    title: 'Penelitian Multivariat (X1, X2, Y)',
    description: 'Kerangka kuesioner untuk menguji pengaruh ganda (dua variabel independen terhadap satu variabel dependen) menggunakan regresi berganda. Skala Likert 5.',
    targetRespondents: 150,
    themeColor: 'rose',
    sections: [
      {
        id: 's_info3',
        name: 'Pengantar Survei',
        type: 'info',
        items: [
          { id: 'q_info3', text: 'Tata Cara', description: 'Mohon berikan ceklis atau pilih tingkat kesetujuan Saudara terhadap pernyataan-pernyataan berikut.', type: 'info' }
        ]
      },
      {
        id: 's_id3',
        name: 'Karakteristik Responden',
        type: 'identity',
        items: [
          { id: 'q_nama3', text: 'Nama', type: 'text' },
        ]
      },
      {
        id: 's_varx1_3',
        name: 'Variabel X1',
        type: 'variable',
        items: [
          { id: 'qx13_1', text: 'Pernyataan 1', type: 'likert', scale: 5 },
          { id: 'qx13_2', text: 'Pernyataan 2', type: 'likert', scale: 5 },
          { id: 'qx13_3', text: 'Pernyataan 3', type: 'likert', scale: 5 },
        ]
      },
      {
        id: 's_varx2_3',
        name: 'Variabel X2',
        type: 'variable',
        items: [
          { id: 'qx23_1', text: 'Pernyataan 1', type: 'likert', scale: 5 },
          { id: 'qx23_2', text: 'Pernyataan 2', type: 'likert', scale: 5 },
          { id: 'qx23_3', text: 'Pernyataan 3', type: 'likert', scale: 5 },
        ]
      },
      {
        id: 's_vary_3',
        name: 'Variabel Y',
        type: 'variable',
        items: [
          { id: 'qy3_1', text: 'Pernyataan 1', type: 'likert', scale: 5 },
          { id: 'qy3_2', text: 'Pernyataan 2', type: 'likert', scale: 5 },
          { id: 'qy3_3', text: 'Pernyataan 3', type: 'likert', scale: 5 },
        ]
      }
    ]
  },
  {
    id: 'tpl_eval',
    title: 'Evaluasi Pembelajaran / Program',
    description: 'Template untuk mengukur keefektifan suatu program. Mengombinasikan pertanyaan pilihan ganda terkait identitas, skala rating, dan pertanyaan esai.',
    targetRespondents: 50,
    themeColor: 'amber',
    sections: [
      {
        id: 's_id4',
        name: 'Identitas Peserta',
        type: 'identity',
        items: [
          { id: 'q_nama4', text: 'Nama Peserta', type: 'text' },
          { id: 'q_kelas4', text: 'Asal Kelas / Divisi', type: 'text' },
        ]
      },
      {
        id: 's_varx4',
        name: 'Kualitas Program (X)',
        type: 'variable',
        items: [
          { id: 'qx4_1', text: 'Pertanyaan 1', type: 'likert', scale: 4 },
          { id: 'qx4_2', text: 'Pertanyaan 2', type: 'likert', scale: 4 },
          { id: 'qx4_3', text: 'Pertanyaan 3', type: 'likert', scale: 4 },
        ]
      },
      {
        id: 's_vary4',
        name: 'Feedback Esai',
        type: 'identity', // using identity section for text/essay to avoid regression analysis on it
        items: [
          { id: 'qy4_1', text: 'Sebutkan hal yang paling bermanfaat dari program ini:', type: 'text' },
          { id: 'qy4_2', text: 'Saran untuk perbaikan di masa depan:', type: 'text' },
        ]
      }
    ]
  }
];
