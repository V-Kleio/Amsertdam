"use client";
import Image from "next/image";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useCurrentUser } from "@/lib/use-current-user";
import HamburgerIcon from "@/components/icons/hamburger-icon";

interface NavbarProps {
  className?: string;
  onOpenSidebar?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ className = "", onOpenSidebar }) => {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [searchValue, setSearchValue] = useState("");

  const profileName = user?.user_metadata?.full_name ?? user?.email ?? "Your profile";
  const profileSubtitle = user?.email ?? "Signed in";
  const initials = useMemo(() => {
    const source = String(profileName || "U");
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "U")
      .join("");
  }, [profileName]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = searchValue.trim();
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : "/search");
  };

  return (
    <nav
      className={`flex w-full flex-col gap-4 bg-cyan-light px-4 py-4 md:flex-row md:items-center md:justify-between md:gap-6 md:px-7.25 md:pt-5 ${className}`}
    >
      <section className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open sidebar"
          className="rounded md:hidden"
          onClick={onOpenSidebar}
        >
          <HamburgerIcon size={22} className="stroke-black-primary" />
        </button>
        <Image
          src="/logo.svg"
          alt="RealTrack Logo"
          width={187}
          height={64}
          className="h-auto w-[140px] md:w-[187px]"
          loading="eager"
        />
      </section>

      <form
        className="flex h-12 w-full items-center gap-3 rounded-[100px] bg-[#F5F5F5] px-4 md:h-14 md:w-126.25 md:gap-4"
        onSubmit={handleSearch}
      >
        <Search size={20} />
        <input
          type="text"
          id="search-input"
          name="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search courses, tasks, flashcards, quizzes"
          className="bg-transparent outline-none w-full text-sm md:text-base"
        />
      </form>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="flex flex-col text-right md:text-left">
          <span className="text-sm font-medium text-black-primary md:text-base">
            {profileName}
          </span>
          <span className="text-xs text-gray-primary md:text-[14px]">
            {profileSubtitle}
          </span>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-gray-500 bg-indigo-primary text-xs font-semibold text-white md:h-13 md:w-13 md:text-sm">
          {initials || "U"}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
