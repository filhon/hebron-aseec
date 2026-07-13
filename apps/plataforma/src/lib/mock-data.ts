import type {
  Certificate,
  Course,
  CourseModule,
  Discussion,
  DiscussionPost,
  Enrollment,
  Instructor,
  Lesson,
  Progress,
  Quiz,
  QuizAttempt,
} from "@hebron/types/plataforma";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const d = (offsetDays: number): Date => {
  const dt = new Date("2026-07-01T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt;
};

const past = (daysAgo: number) => d(-daysAgo);

// ─── Pessoas de referência ────────────────────────────────────────────────────

const pessoas = {
  elias: { id: "user-superadmin-01", name: "Pr. Elias Cavalcanti" },
  rosana: { id: "user-colab-01", name: "Rosana Batista" },
  joao: { id: "user-aluno-01", name: "João Pedro Lima" },
  marcia: { id: "user-aluno-02", name: "Márcia Ferreira" },
  diego: { id: "user-aluno-03", name: "Diego Santos" },
};

// ─── Instructors ──────────────────────────────────────────────────────────────

export const mockInstructors: Instructor[] = [
  {
    id: "instr-01",
    userId: pessoas.elias.id,
    name: pessoas.elias.name,
    avatarUrl: null,
    bio: "Pastor e professor, à frente da formação de líderes da Hebron Aseec há mais de 15 anos.",
    createdAt: past(400),
    updatedAt: past(400),
  },
  {
    id: "instr-02",
    userId: null,
    name: pessoas.rosana.name,
    avatarUrl: null,
    bio: "Discipuladora voluntária, responsável pelo acompanhamento de novos convertidos.",
    createdAt: past(120),
    updatedAt: past(120),
  },
];

// ─── Courses ──────────────────────────────────────────────────────────────────
// "Fundamentos da Liderança Cristã" é o curso piloto já pronto (BRAIN §6.3),
// usado como referência de profundidade de conteúdo para os demais.

export const mockCourses: Course[] = [
  {
    id: "course-01",
    title: "Fundamentos da Liderança Cristã",
    slug: "fundamentos-lideranca-crista",
    description:
      "Curso piloto da Plataforma: princípios bíblicos de liderança, formação de caráter e prática de serviço, com trilha sequencial e avaliação por quiz.",
    coverImageUrl: null,
    category: "Liderança",
    instructorId: "instr-01",
    instructorName: pessoas.elias.name,
    isPublished: true,
    createdAt: past(180),
    updatedAt: past(5),
  },
  {
    id: "course-02",
    title: "Discipulado para Novos Convertidos",
    slug: "discipulado-novos-convertidos",
    description:
      "Trilha introdutória para quem acabou de decidir seguir a fé cristã: primeiros passos, hábitos devocionais e vida em comunidade.",
    coverImageUrl: null,
    category: "Discipulado",
    instructorId: "instr-02",
    instructorName: pessoas.rosana.name,
    isPublished: true,
    createdAt: past(60),
    updatedAt: past(10),
  },
  {
    id: "course-03",
    title: "Introdução à Homilética",
    slug: "introducao-homiletica",
    description:
      "Fundamentos da preparação e pregação de mensagens bíblicas, em desenvolvimento pela equipe de ensino.",
    coverImageUrl: null,
    category: "Ensino",
    instructorId: "instr-01",
    instructorName: pessoas.elias.name,
    isPublished: false,
    createdAt: past(15),
    updatedAt: past(2),
  },
];

// ─── CourseModules ────────────────────────────────────────────────────────────

export const mockCourseModules: CourseModule[] = [
  {
    id: "mod-01a",
    courseId: "course-01",
    title: "Bases bíblicas da liderança",
    description: "O que as Escrituras ensinam sobre servir e liderar.",
    order: 0,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "mod-01b",
    courseId: "course-01",
    title: "Prática de liderança",
    description: "Aplicando os princípios no dia a dia da igreja e da equipe.",
    order: 1,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "mod-02a",
    courseId: "course-02",
    title: "Primeiros passos na fé",
    description: null,
    order: 0,
    createdAt: past(60),
    updatedAt: past(60),
  },
  {
    id: "mod-03a",
    courseId: "course-03",
    title: "Estrutura do sermão",
    description: null,
    order: 0,
    createdAt: past(15),
    updatedAt: past(15),
  },
];

// ─── Lessons ──────────────────────────────────────────────────────────────────
// Trilha sequencial: nextLessonId encadeia as aulas na ordem do curso;
// requiresCompletion = false apenas na primeira aula de cada curso (BRAIN §6.3).

export const mockLessons: Lesson[] = [
  {
    id: "l1-01",
    moduleId: "mod-01a",
    courseId: "course-01",
    title: "Servir para liderar",
    type: "video",
    order: 0,
    videoUrl: "https://video.hebronaseec.com.br/fundamentos-lideranca/aula-01",
    videoDurationSeconds: 720,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: "l1-02",
    requiresCompletion: false,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "l1-02",
    moduleId: "mod-01a",
    courseId: "course-01",
    title: "O caráter do líder segundo as Escrituras",
    type: "text",
    order: 1,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent:
      "<p>Um estudo sobre os frutos do caráter esperados de quem lidera, a partir de 1 Timóteo 3 e Tito 1.</p>",
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: "l1-03",
    requiresCompletion: true,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "l1-03",
    moduleId: "mod-01a",
    courseId: "course-01",
    title: "Material de apoio: roteiro de estudo pessoal",
    type: "download",
    order: 2,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent: null,
    downloadUrl:
      "https://docs.hebronaseec.com.br/plataforma/roteiro-modulo-1.pdf",
    downloadFileName: "roteiro-modulo-1.pdf",
    downloadFileSizeBytes: 482_300,
    quizId: null,
    nextLessonId: "l1-04",
    requiresCompletion: true,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "l1-04",
    moduleId: "mod-01a",
    courseId: "course-01",
    title: "Avaliação: bases bíblicas da liderança",
    type: "quiz",
    order: 3,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: "quiz-01",
    nextLessonId: "l1-05",
    requiresCompletion: true,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "l1-05",
    moduleId: "mod-01b",
    courseId: "course-01",
    title: "Delegando com confiança",
    type: "video",
    order: 0,
    videoUrl: "https://video.hebronaseec.com.br/fundamentos-lideranca/aula-05",
    videoDurationSeconds: 655,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: "l1-06",
    requiresCompletion: true,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "l1-06",
    moduleId: "mod-01b",
    courseId: "course-01",
    title: "Avaliação final: prática de liderança",
    type: "quiz",
    order: 1,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: "quiz-02",
    nextLessonId: null,
    requiresCompletion: true,
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "l2-01",
    moduleId: "mod-02a",
    courseId: "course-02",
    title: "O que muda quando decidimos seguir a Cristo",
    type: "video",
    order: 0,
    videoUrl: "https://video.hebronaseec.com.br/discipulado/aula-01",
    videoDurationSeconds: 480,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: "l2-02",
    requiresCompletion: false,
    createdAt: past(60),
    updatedAt: past(60),
  },
  {
    id: "l2-02",
    moduleId: "mod-02a",
    courseId: "course-02",
    title: "Hábitos devocionais: oração e leitura bíblica",
    type: "text",
    order: 1,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent:
      "<p>Um guia prático para começar um tempo devocional diário, com sugestão de plano de leitura.</p>",
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: "l2-03",
    requiresCompletion: true,
    createdAt: past(60),
    updatedAt: past(60),
  },
  {
    id: "l2-03",
    moduleId: "mod-02a",
    courseId: "course-02",
    title: "Avaliação: primeiros passos na fé",
    type: "quiz",
    order: 2,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: "quiz-03",
    nextLessonId: "l2-04",
    requiresCompletion: true,
    createdAt: past(60),
    updatedAt: past(60),
  },
  {
    id: "l2-04",
    moduleId: "mod-02a",
    courseId: "course-02",
    title: "Material de apoio: plano de leitura de 30 dias",
    type: "download",
    order: 3,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent: null,
    downloadUrl:
      "https://docs.hebronaseec.com.br/plataforma/plano-leitura-30-dias.pdf",
    downloadFileName: "plano-leitura-30-dias.pdf",
    downloadFileSizeBytes: 210_150,
    quizId: null,
    nextLessonId: null,
    requiresCompletion: true,
    createdAt: past(60),
    updatedAt: past(60),
  },
  {
    id: "l3-01",
    moduleId: "mod-03a",
    courseId: "course-03",
    title: "O que é um sermão expositivo",
    type: "video",
    order: 0,
    videoUrl: "https://video.hebronaseec.com.br/homiletica/aula-01",
    videoDurationSeconds: 540,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: "l3-02",
    requiresCompletion: false,
    createdAt: past(15),
    updatedAt: past(15),
  },
  {
    id: "l3-02",
    moduleId: "mod-03a",
    courseId: "course-03",
    title: "Escolhendo e delimitando o texto bíblico",
    type: "text",
    order: 1,
    videoUrl: null,
    videoDurationSeconds: null,
    textContent:
      "<p>Rascunho: critérios para escolher a passagem e delimitar a unidade de pensamento do texto.</p>",
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: "l3-03",
    requiresCompletion: true,
    createdAt: past(15),
    updatedAt: past(2),
  },
  {
    id: "l3-03",
    moduleId: "mod-03a",
    courseId: "course-03",
    title: "Estruturando a introdução e a conclusão",
    type: "video",
    order: 2,
    videoUrl: "https://video.hebronaseec.com.br/homiletica/aula-03",
    videoDurationSeconds: 610,
    textContent: null,
    downloadUrl: null,
    downloadFileName: null,
    downloadFileSizeBytes: null,
    quizId: null,
    nextLessonId: null,
    requiresCompletion: true,
    createdAt: past(15),
    updatedAt: past(15),
  },
];

// ─── Quizzes ──────────────────────────────────────────────────────────────────
// Semântica PATCH-010: aula-quiz conclui com attempt.score >= passingScore;
// tentativas ilimitadas.

export const mockQuizzes: Quiz[] = [
  {
    id: "quiz-01",
    lessonId: "l1-04",
    passingScore: 70,
    questions: [
      {
        id: "q1-1",
        text: "Segundo 1 Timóteo 3, qual característica é exigida de quem aspira à liderança?",
        options: [
          { id: "q1-1-a", text: "Ser irrepreensível" },
          { id: "q1-1-b", text: "Ter formação teológica formal" },
          { id: "q1-1-c", text: "Ser o membro mais antigo da igreja" },
        ],
        correctOptionId: "q1-1-a",
      },
      {
        id: "q1-2",
        text: "O curso define liderança cristã principalmente como:",
        options: [
          { id: "q1-2-a", text: "Autoridade sobre pessoas" },
          { id: "q1-2-b", text: "Serviço ao próximo" },
          { id: "q1-2-c", text: "Gestão de recursos" },
        ],
        correctOptionId: "q1-2-b",
      },
    ],
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "quiz-02",
    lessonId: "l1-06",
    passingScore: 80,
    questions: [
      {
        id: "q2-1",
        text: "Delegar com confiança pressupõe principalmente:",
        options: [
          { id: "q2-1-a", text: "Acompanhar sem controlar excessivamente" },
          { id: "q2-1-b", text: "Repetir a tarefa até fazer sozinho" },
          { id: "q2-1-c", text: "Escolher sempre quem já sabe fazer" },
        ],
        correctOptionId: "q2-1-a",
      },
      {
        id: "q2-2",
        text: "Uma equipe bem liderada se reconhece por:",
        options: [
          { id: "q2-2-a", text: "Depender do líder para toda decisão" },
          { id: "q2-2-b", text: "Crescer em autonomia e responsabilidade" },
          { id: "q2-2-c", text: "Evitar conflitos a qualquer custo" },
        ],
        correctOptionId: "q2-2-b",
      },
    ],
    createdAt: past(180),
    updatedAt: past(180),
  },
  {
    id: "quiz-03",
    lessonId: "l2-03",
    passingScore: 60,
    questions: [
      {
        id: "q3-1",
        text: "Um hábito devocional saudável deve ser, acima de tudo:",
        options: [
          { id: "q3-1-a", text: "Constante, mesmo que breve" },
          { id: "q3-1-b", text: "Longo, ainda que raro" },
          { id: "q3-1-c", text: "Idêntico ao de outra pessoa" },
        ],
        correctOptionId: "q3-1-a",
      },
    ],
    createdAt: past(60),
    updatedAt: past(60),
  },
];

// ─── Enrollments ──────────────────────────────────────────────────────────────

export const mockEnrollments: Enrollment[] = [
  {
    id: "enroll-01",
    userId: pessoas.joao.id,
    userName: pessoas.joao.name,
    courseId: "course-01",
    courseName: "Fundamentos da Liderança Cristã",
    enrolledAt: past(170),
    completedAt: past(3),
  },
  {
    id: "enroll-02",
    userId: pessoas.marcia.id,
    userName: pessoas.marcia.name,
    courseId: "course-01",
    courseName: "Fundamentos da Liderança Cristã",
    enrolledAt: past(90),
    completedAt: null,
  },
  {
    id: "enroll-03",
    userId: pessoas.joao.id,
    userName: pessoas.joao.name,
    courseId: "course-02",
    courseName: "Discipulado para Novos Convertidos",
    enrolledAt: past(50),
    completedAt: null,
  },
  {
    id: "enroll-04",
    userId: pessoas.diego.id,
    userName: pessoas.diego.name,
    courseId: "course-02",
    courseName: "Discipulado para Novos Convertidos",
    enrolledAt: past(20),
    completedAt: null,
  },
];

// ─── Progress ─────────────────────────────────────────────────────────────────
// Granular por aula (BRAIN §6.3). João concluiu todas as aulas do curso piloto —
// base para o Certificate abaixo. Márcia está no meio da trilha.

export const mockProgress: Progress[] = [
  {
    id: "prog-01",
    userId: pessoas.joao.id,
    lessonId: "l1-01",
    courseId: "course-01",
    completedAt: past(168),
    createdAt: past(168),
  },
  {
    id: "prog-02",
    userId: pessoas.joao.id,
    lessonId: "l1-02",
    courseId: "course-01",
    completedAt: past(160),
    createdAt: past(160),
  },
  {
    id: "prog-03",
    userId: pessoas.joao.id,
    lessonId: "l1-03",
    courseId: "course-01",
    completedAt: past(155),
    createdAt: past(155),
  },
  {
    id: "prog-04",
    userId: pessoas.joao.id,
    lessonId: "l1-04",
    courseId: "course-01",
    completedAt: past(150),
    createdAt: past(152),
  },
  {
    id: "prog-05",
    userId: pessoas.joao.id,
    lessonId: "l1-05",
    courseId: "course-01",
    completedAt: past(10),
    createdAt: past(10),
  },
  {
    id: "prog-06",
    userId: pessoas.joao.id,
    lessonId: "l1-06",
    courseId: "course-01",
    completedAt: past(3),
    createdAt: past(4),
  },
  {
    id: "prog-07",
    userId: pessoas.marcia.id,
    lessonId: "l1-01",
    courseId: "course-01",
    completedAt: past(88),
    createdAt: past(88),
  },
  {
    id: "prog-08",
    userId: pessoas.marcia.id,
    lessonId: "l1-02",
    courseId: "course-01",
    completedAt: past(80),
    createdAt: past(80),
  },
  {
    id: "prog-09",
    userId: pessoas.marcia.id,
    lessonId: "l1-03",
    courseId: "course-01",
    completedAt: null,
    createdAt: past(75),
  },
];

// ─── QuizAttempts ─────────────────────────────────────────────────────────────
// Tentativas ilimitadas (PATCH-010) — João reprovou a primeira tentativa do
// quiz-02 e passou na segunda.

export const mockQuizAttempts: QuizAttempt[] = [
  {
    id: "attempt-01",
    quizId: "quiz-01",
    userId: pessoas.joao.id,
    answers: [
      { questionId: "q1-1", optionId: "q1-1-a" },
      { questionId: "q1-2", optionId: "q1-2-b" },
    ],
    score: 100,
    passed: true,
    attemptedAt: past(150),
  },
  {
    id: "attempt-02",
    quizId: "quiz-02",
    userId: pessoas.joao.id,
    answers: [
      { questionId: "q2-1", optionId: "q2-1-b" },
      { questionId: "q2-2", optionId: "q2-2-b" },
    ],
    score: 50,
    passed: false,
    attemptedAt: past(5),
  },
  {
    id: "attempt-03",
    quizId: "quiz-02",
    userId: pessoas.joao.id,
    answers: [
      { questionId: "q2-1", optionId: "q2-1-a" },
      { questionId: "q2-2", optionId: "q2-2-b" },
    ],
    score: 100,
    passed: true,
    attemptedAt: past(3),
  },
];

// ─── Certificates ─────────────────────────────────────────────────────────────
// Certificação v1: automática, concluir 100% da trilha = certificado
// (BRAIN §6.3). hash é o valor verificado pela rota pública (PATCH-010).

export const mockCertificates: Certificate[] = [
  {
    id: "cert-01",
    courseId: "course-01",
    courseName: "Fundamentos da Liderança Cristã",
    userId: pessoas.joao.id,
    userName: pessoas.joao.name,
    issuedAt: past(3),
    hash: "a3f1c9e2b6d47f0891a5c3e7d2b8f4109c6e5a2b7d1f30489e6c2a5b9d3f7108",
  },
];

// ─── Discussions ──────────────────────────────────────────────────────────────
// Fórum por aula (BRAIN §6.3, nice-to-have incluído).

export const mockDiscussions: Discussion[] = [
  {
    id: "disc-01",
    lessonId: "l1-02",
    courseId: "course-01",
    createdAt: past(158),
  },
];

// ─── DiscussionPosts ──────────────────────────────────────────────────────────

export const mockDiscussionPosts: DiscussionPost[] = [
  {
    id: "post-01",
    discussionId: "disc-01",
    authorId: pessoas.joao.id,
    authorName: pessoas.joao.name,
    content:
      "Alguém tem uma dica de como aplicar esse estudo de caráter em uma equipe pequena, tipo 3 pessoas?",
    parentPostId: null,
    createdAt: past(158),
    updatedAt: null,
  },
  {
    id: "post-02",
    discussionId: "disc-01",
    authorId: pessoas.elias.id,
    authorName: pessoas.elias.name,
    content:
      "Boa pergunta! Em equipes pequenas, o exemplo pessoal pesa ainda mais do que qualquer reunião formal — comece por aí.",
    parentPostId: "post-01",
    createdAt: past(157),
    updatedAt: null,
  },
  {
    id: "post-03",
    discussionId: "disc-01",
    authorId: pessoas.marcia.id,
    authorName: pessoas.marcia.name,
    content:
      "Muito bom esse módulo, ajudou bastante a repensar como eu lidero meu grupo de jovens.",
    parentPostId: null,
    createdAt: past(75),
    updatedAt: null,
  },
];
