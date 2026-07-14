import * as React from "react";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { makeNotificationInserter } from "@hebron/db/notifications";
import { createNotification } from "@hebron/email";
import { EnrollmentConfirmedEmail } from "@hebron/email/templates/enrollment-confirmed";
import { NewCourseEmail } from "@hebron/email/templates/new-course";
import { CertificateIssuedEmail } from "@hebron/email/templates/certificate-issued";
import {
  certificates,
  consents,
  courses,
  discussionPosts,
  discussions,
  enrollments,
  instructors,
  users,
} from "@hebron/db/schema";

// ──────────────────────────────────────────────────────────────────────────────

const makeInsert = makeNotificationInserter;

const PLATAFORMA_BASE_URL =
  process.env.NEXT_PUBLIC_PLATAFORMA_URL ??
  "https://plataforma.hebronaseec.com.br";

function courseUrl(slug: string): string {
  return `${PLATAFORMA_BASE_URL}/curso/${slug}`;
}

function certificatesUrl(): string {
  return `${PLATAFORMA_BASE_URL}/certificados`;
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyEnrollmentConfirmed — email transacional ao aluno, disparado só na
// primeira matrícula (enrollInCourse é idempotente; reclique não reenvia).
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyEnrollmentConfirmed(
  enrollmentId: string,
): Promise<void> {
  const [row] = await db
    .select({
      userId: enrollments.userId,
      email: users.email,
      fullName: users.fullName,
      courseId: courses.id,
      courseTitle: courses.title,
      courseSlug: courses.slug,
      instructorName: instructors.name,
    })
    .from(enrollments)
    .innerJoin(courses, eq(courses.id, enrollments.courseId))
    .innerJoin(users, eq(users.id, enrollments.userId))
    .leftJoin(instructors, eq(instructors.id, courses.instructorId))
    .where(eq(enrollments.id, enrollmentId))
    .limit(1);
  if (!row) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  const url = courseUrl(row.courseSlug);
  const title = `Matrícula confirmada: ${row.courseTitle}`;

  await createNotification({
    insert: makeInsert(),
    resendApiKey,
    data: {
      userId: row.userId,
      channel: "email",
      type: "enrollment.confirmed",
      title,
      body: `Você está matriculado em "${row.courseTitle}"`,
      payload: { courseId: row.courseId, href: `/curso/${row.courseSlug}` },
    },
    email: {
      to: row.email,
      subject: title,
      template: React.createElement(EnrollmentConfirmedEmail, {
        recipientName: row.fullName ?? row.email,
        courseTitle: row.courseTitle,
        instructorName: row.instructorName ?? "Hebron Aseec",
        courseUrl: url,
      }),
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyNewCoursePublished — email só a usuários ativos com consentimento de
// newsletter/novidades (public.consents, purpose="newsletter", P-0.13).
// Nunca dispara para a base inteira sem esse opt-in.
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyNewCoursePublished(
  courseId: string,
): Promise<void> {
  const [course] = await db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      category: courses.category,
      instructorName: instructors.name,
    })
    .from(courses)
    .leftJoin(instructors, eq(instructors.id, courses.instructorId))
    .where(eq(courses.id, courseId))
    .limit(1);
  if (!course) return;

  const recipients = await db
    .select({
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
    })
    .from(users)
    .innerJoin(consents, eq(consents.userId, users.id))
    .where(
      and(
        eq(consents.purpose, "newsletter"),
        eq(consents.granted, true),
        eq(users.status, "active"),
        isNull(users.suspendedAt),
      ),
    );
  if (recipients.length === 0) return;

  const url = courseUrl(course.slug);
  const resendApiKey = process.env.RESEND_API_KEY;
  const title = `Novo curso: ${course.title}`;

  await Promise.all(
    recipients.map((recipient) =>
      createNotification({
        insert: makeInsert(),
        resendApiKey,
        data: {
          userId: recipient.userId,
          channel: "email",
          type: "course.published",
          title,
          body: course.description,
          payload: { courseId: course.id, href: `/curso/${course.slug}` },
        },
        email: {
          to: recipient.email,
          subject: title,
          template: React.createElement(NewCourseEmail, {
            recipientName: recipient.fullName ?? recipient.email,
            courseTitle: course.title,
            courseDescription: course.description,
            category: course.category,
            instructorName: course.instructorName ?? "Hebron Aseec",
            courseUrl: url,
          }),
        },
      }),
    ),
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyCertificateIssued — in_app + email ao aluno (transacional).
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyCertificateIssued(
  certificateId: string,
): Promise<void> {
  const [row] = await db
    .select({
      userId: certificates.userId,
      issuedAt: certificates.issuedAt,
      courseTitle: courses.title,
      email: users.email,
      fullName: users.fullName,
    })
    .from(certificates)
    .innerJoin(courses, eq(courses.id, certificates.courseId))
    .innerJoin(users, eq(users.id, certificates.userId))
    .where(eq(certificates.id, certificateId))
    .limit(1);
  if (!row) return;

  const resendApiKey = process.env.RESEND_API_KEY;
  const title = `Certificado emitido: ${row.courseTitle}`;
  const body = `Você concluiu o curso "${row.courseTitle}" e seu certificado já está disponível.`;

  await Promise.allSettled([
    createNotification({
      insert: makeInsert(),
      data: {
        userId: row.userId,
        channel: "in_app",
        type: "certificate.issued",
        title,
        body,
        payload: { certificateId, href: "/certificados" },
      },
    }),
    createNotification({
      insert: makeInsert(),
      resendApiKey,
      data: {
        userId: row.userId,
        channel: "email",
        type: "certificate.issued",
        title,
        body,
        payload: { certificateId, href: "/certificados" },
      },
      email: {
        to: row.email,
        subject: title,
        template: React.createElement(CertificateIssuedEmail, {
          recipientName: row.fullName ?? row.email,
          courseTitle: row.courseTitle,
          issuedAt: row.issuedAt,
          certificatesUrl: certificatesUrl(),
        }),
      },
    }),
  ]);
}

// ──────────────────────────────────────────────────────────────────────────────
// notifyDiscussionReply — in_app ao autor do post original (só quando o novo
// post é de fato uma resposta e o autor não está respondendo a si mesmo).
// ──────────────────────────────────────────────────────────────────────────────

export async function notifyDiscussionReply(postId: string): Promise<void> {
  const [post] = await db
    .select({
      id: discussionPosts.id,
      authorId: discussionPosts.authorId,
      parentPostId: discussionPosts.parentPostId,
      lessonId: discussions.lessonId,
      courseSlug: courses.slug,
    })
    .from(discussionPosts)
    .innerJoin(discussions, eq(discussions.id, discussionPosts.discussionId))
    .innerJoin(courses, eq(courses.id, discussions.courseId))
    .where(eq(discussionPosts.id, postId))
    .limit(1);
  if (!post?.parentPostId) return;

  const [parentPost] = await db
    .select({ authorId: discussionPosts.authorId })
    .from(discussionPosts)
    .where(eq(discussionPosts.id, post.parentPostId))
    .limit(1);
  if (!parentPost || parentPost.authorId === post.authorId) return;

  const [author] = await db
    .select({ fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, post.authorId))
    .limit(1);
  const authorName = author?.fullName ?? author?.email ?? "Alguém";

  await createNotification({
    insert: makeInsert(),
    data: {
      userId: parentPost.authorId,
      channel: "in_app",
      type: "discussion.replied",
      title: "Nova resposta no fórum",
      body: `${authorName} respondeu ao seu comentário`,
      payload: {
        postId: post.id,
        href: `/curso/${post.courseSlug}/aula/${post.lessonId}`,
      },
    },
  });
}
