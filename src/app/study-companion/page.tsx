"use client";

import Link from "next/link";
import { FileText, MessagesSquare, Sparkles } from "lucide-react";
import { useStore } from "@/store/use-store";

export default function StudyCompanion() {
  const attempts = useStore((s) => s.attempts);

  // De-duplicate by quizId, keep latest
  const latestByQuiz = new Map<string, (typeof attempts)[number]>();
  for (const a of attempts) {
    const prev = latestByQuiz.get(a.quizId);
    if (!prev || new Date(a.completedAt) > new Date(prev.completedAt)) {
      latestByQuiz.set(a.quizId, a);
    }
  }
  const quizzes = Array.from(latestByQuiz.values()).sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-14.75 md:py-11.5">
      {/* Header */}
      <div className="mb-10 sm:mb-12">
        <h1 className="mb-2 text-[24px] font-semibold text-black-primary sm:text-[28px]">
          Study Companion
        </h1>
        <p className="text-gray-primary">
          AI that reviews your answers, explains mistakes, and helps you improve.
        </p>
      </div>

      {/* Completed Quizzes Section */}
      <div className="mb-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black-primary sm:text-xl">
            Completed Quizzes
          </h2>
          <span className="text-sm text-gray-primary">
            {quizzes.length} elements
          </span>
        </div>

        {quizzes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
            <Sparkles size={28} className="mx-auto text-indigo-primary mb-3" />
            <h3 className="text-base font-semibold text-black-primary mb-1">
              No completed quizzes yet
            </h3>
            <p className="text-sm text-gray-primary mb-4">
              Take a quiz from Quiz Lab and your results will show up here for AI review.
            </p>
            <Link
              href="/quiz-lab"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-primary text-white rounded-lg hover:opacity-90 text-sm font-medium"
            >
              Go to Quiz Lab
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-black-primary mb-1">
                      {quiz.quizTitle}
                    </h3>
                    <p className="text-sm text-gray-primary mb-3">{quiz.course}</p>
                    <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-primary text-xs font-medium rounded-full">
                      {quiz.correct}/{quiz.total} correct
                    </span>
                  </div>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    <Link
                      href={`/study-companion/${quiz.quizId}/review`}
                      className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-black-primary transition-colors hover:bg-gray-50"
                    >
                      <FileText size={16} />
                      Review
                    </Link>
                    <Link
                      href={`/study-companion/${quiz.quizId}/chat`}
                      className="flex items-center justify-center gap-2 rounded-lg bg-indigo-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                    >
                      <MessagesSquare size={16} />
                      Chat with AI
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
