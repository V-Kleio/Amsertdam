"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Play } from "lucide-react";
import toast from "react-hot-toast";
import { useQuizById } from "@/lib/quiz-data";

export default function QuizPreview({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = use(params);
  const quiz = useQuizById(quizId);

  if (!quiz) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-14.75 md:py-11.5">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/quiz-lab"
          className="flex items-center gap-2 text-black-primary hover:text-indigo-primary transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to Quizzes</span>
        </Link>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <button
            onClick={() => toast.success("Download started")}
            className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-black-primary transition-colors hover:bg-gray-50"
          >
            <Download size={18} />
            <span className="text-sm font-medium">Download</span>
          </button>
          <Link
            href={`/quiz-lab/${quiz.id}/take`}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-primary px-4 py-2 text-white transition-colors hover:bg-indigo-600"
          >
            <Play size={16} />
            <span className="text-sm font-medium">Take Quiz</span>
          </Link>
        </div>
      </div>

      <div className="mb-10">
        <h1 className="mb-1 text-[24px] font-semibold text-black-primary sm:text-[28px]">
          {quiz.title}
        </h1>
        <p className="text-gray-primary">
          {quiz.course} &bull; {quiz.questions.length} questions
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {quiz.questions.map((q, idx) => (
          <article
            key={q.id}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <h2 className="text-base font-semibold text-black-primary mb-4">
              {idx + 1}. {q.prompt}
            </h2>
            <ul className="flex flex-col gap-2 pl-2">
              {q.options.map((opt) => (
                <li
                  key={opt.letter}
                  className="text-sm text-gray-primary"
                >
                  <span className="font-medium text-black-primary">
                    {opt.letter}.
                  </span>{" "}
                  {opt.text}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}
