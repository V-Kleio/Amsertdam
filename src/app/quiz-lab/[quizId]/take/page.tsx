"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useQuizById } from "@/lib/quiz-data";

type Answer = "A" | "B" | "C" | "D";

export default function TakeQuiz({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = use(params);
  const quiz = useQuizById(quizId);
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});

  if (!quiz) {
    notFound();
  }

  const total = quiz.questions.length;
  const question = quiz.questions[current];
  const progress = ((current + 1) / total) * 100;
  const selected = answers[question.id];

  const handleSelect = (letter: Answer) => {
    setAnswers((prev) => ({ ...prev, [question.id]: letter }));
  };

  const handleNext = () => {
    if (current < total - 1) {
      setCurrent((c) => c + 1);
    } else {
      submit();
    }
  };

  const submit = () => {
    const payload = encodeURIComponent(JSON.stringify(answers));
    router.push(`/quiz-lab/${quiz.id}/result?a=${payload}`);
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6 sm:px-6 lg:px-14.75 md:py-11.5">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <div className="flex-1 max-w-[920px]">
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <Link
                href="/quiz-lab"
                className="flex items-center gap-2 text-black-primary hover:text-indigo-primary transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="text-sm font-medium">Exit Quiz</span>
              </Link>
              <span className="text-sm text-gray-primary">
                {current + 1} out of {total} questions
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full bg-indigo-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <h1 className="mb-2 text-[22px] font-semibold text-black-primary sm:text-[24px]">
            {quiz.title}
          </h1>

          <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
            <h2 className="mb-6 text-base font-medium text-black-primary sm:text-lg">
              {question.prompt}
            </h2>
            <div className="flex flex-col gap-3">
              {question.options.map((opt) => {
                const isSelected = selected === opt.letter;
                return (
                  <button
                    key={opt.letter}
                    type="button"
                    onClick={() => handleSelect(opt.letter)}
                    className={`flex items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors ${isSelected
                        ? "border-indigo-primary bg-indigo-primary/5"
                        : "border-gray-200 hover:border-indigo-primary/50"
                      }`}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold sm:h-10 sm:w-10 ${isSelected
                          ? "border-indigo-primary bg-indigo-primary text-white"
                          : "border-gray-300 text-black-primary"
                        }`}
                    >
                      {opt.letter}
                    </span>
                    <span className="text-sm text-black-primary sm:text-base">
                      {opt.text}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end sm:mt-8">
            <button
              type="button"
              onClick={handleNext}
              disabled={!selected}
              className="flex items-center gap-2 rounded-lg bg-indigo-primary px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {current < total - 1 ? "Next" : "Finish"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        <aside className="w-full shrink-0 lg:w-[214px]">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-black-primary mb-4">
              Quiz Navigation
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {quiz.questions.map((q, idx) => {
                const answered = answers[q.id] !== undefined;
                const active = idx === current;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrent(idx)}
                    className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition-colors ${active
                        ? "bg-indigo-primary text-white"
                        : answered
                          ? "bg-indigo-primary/10 text-indigo-primary"
                          : "border border-gray-300 text-gray-primary hover:border-indigo-primary"
                      }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={submit}
              className="text-sm font-medium text-indigo-primary hover:underline"
            >
              Finish quiz
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
