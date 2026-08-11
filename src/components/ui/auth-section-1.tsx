"use client";

import { GrainGradient } from "@paper-design/shaders-react";
import { useState } from "react";
import type { ReactNode } from "react";

const formFields = [
  { label: "First Name", value: "Harshit", type: "text" },
  { label: "Last Name", value: "Sharma", type: "text" },
];

const termsText = (
  <>
    By creating an account, you agree to our{" "}
    <a
      href="#"
      className="font-medium text-black/50 underline underline-offset-2 dark:text-white/45 hover:text-black dark:hover:text-white transition-colors"
    >
      Terms and Services
    </a>{" "}
    and{" "}
    <a
      href="#"
      className="font-medium text-black/50 underline underline-offset-2 dark:text-white/45 hover:text-black dark:hover:text-white transition-colors"
    >
      Privacy Policy
    </a>
  </>
);

export default function AuthSectionOne() {
  return (
    <section className="min-h-screen bg-white p-3 text-black antialiased [font-synthesis:none] dark:bg-[#050505] dark:text-white">
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-6 lg:grid-cols-[1.18fr_0.82fr] xl:grid-cols-[1.22fr_0.78fr]">
        <div className="flex min-h-[600px] items-center rounded-md border border-black/20 bg-white px-6 py-8 sm:px-10 dark:border-white/10 dark:bg-[#0a0a0a] lg:min-h-0 lg:px-12 lg:py-14">
          <div className="mx-auto w-full max-w-[510px]">
            <div>
              <div className="mb-5 flex items-center justify-start">
                <img
                  src="https://ik.imagekit.io/dypkhqxip/wrkspacenew"
                  alt="wrkspace"
                  className="h-11 sm:h-14 w-auto object-contain max-w-[220px]"
                />
              </div>
              <h1 className="whitespace-nowrap text-2xl font-medium tracking-[-0.03em] sm:text-3xl lg:text-3xl xl:text-3xl">
                Create an account
              </h1>
              <p className="mt-1.5 whitespace-nowrap text-xs text-black/60 dark:text-white/55 sm:text-sm lg:text-base">
                Brainstorm in chat, build in cowork
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <SocialButton icon={<GoogleIcon />} label="Sign up with Google" />
              <SocialButton icon={<AppleIcon />} label="Sign up with Apple" />
            </div>

            <div className="my-5 text-center text-xs font-semibold uppercase tracking-wider text-black/40 dark:text-white/40">
              or
            </div>

            <form className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {formFields.map((field) => (
                  <FieldBox
                    key={field.label}
                    label={field.label}
                    value={field.value}
                  />
                ))}
              </div>

              <FieldBox
                label="Email"
                value="harshitlog@gmail.com"
                type="email"
              />
              <FieldBox
                label="Password"
                value="*************"
                type="password"
              />

              <div className="space-y-2 pt-1 text-xs leading-relaxed text-black/40 dark:text-white/40">
                <CheckboxLine>
                  I don't want to receive emails about solaceui feature updates
                </CheckboxLine>
                <CheckboxLine>{termsText}</CheckboxLine>
              </div>

              <button
                type="button"
                className="mt-6 flex h-11 w-full items-center justify-center rounded-[10px] border border-black/40 bg-black text-base font-semibold text-white transition-all hover:bg-black/85 dark:border-white/40 dark:bg-white dark:text-black dark:hover:bg-white/85 cursor-pointer"
              >
                Submit
              </button>
            </form>
          </div>
        </div>

        <div className="relative flex min-h-[550px] overflow-hidden rounded-md bg-black p-6 text-white sm:p-8 lg:min-h-0 lg:p-10">
          <GrainGradient
            speed={1}
            scale={1}
            rotation={0}
            offsetX={0}
            offsetY={0}
            softness={0.5}
            intensity={0.5}
            noise={0.25}
            shape="corners"
            frame={2854.5}
            colors={["#FFFFFF", "#FC7819", "#FC7819", "#FFFFFF"]}
            colorBack="#00000000"
            className="absolute inset-0 bg-black"
          />

          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <div className="pt-2 lg:pt-6">
              <h2 className="text-3xl font-medium tracking-[-0.04em] text-white sm:text-4xl lg:text-[44px] lg:leading-[1.02] xl:text-[50px]">
                Think fast,
                <br />
                Build faster
              </h2>
            </div>

            <div className="w-full text-center pb-1 text-xs font-medium text-white/60 tracking-wide">
              © 2026 Redlix Studio. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SocialButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-10 items-center justify-center gap-2 rounded-[10px] border border-black/25 bg-white px-3 text-xs font-medium text-black transition-colors hover:bg-black/[0.03] dark:border-white/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 sm:text-sm cursor-pointer"
    >
      <span className="shrink-0">{icon}</span>
      <span className="whitespace-nowrap truncate">{label}</span>
    </button>
  );
}

function FieldBox({
  label,
  value,
  type = "text",
}: {
  label: string;
  value: string;
  type?: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <label className="flex h-11 items-center justify-between gap-3 rounded-[10px] border border-black/25 bg-white px-4 text-sm leading-none dark:border-white/15 dark:bg-white/5">
      <input
        type={type}
        value={inputValue}
        aria-label={label}
        onFocus={() => {
          if (!isEditing) {
            setInputValue("");
            setIsEditing(true);
          }
        }}
        onChange={(event) => {
          setInputValue(event.target.value);
          setIsEditing(true);
        }}
        className="min-w-0 flex-1 truncate bg-transparent text-black text-sm outline-none placeholder:text-black/30 dark:text-white dark:placeholder:text-white/35"
      />
      {!isEditing && (
        <span className="shrink-0 text-black/50 text-xs font-medium dark:text-white/50">{label}</span>
      )}
    </label>
  );
}

function CheckboxLine({ children }: { children: ReactNode }) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer">
      <span className="relative mt-0.5 size-3.5 shrink-0">
        <input
          type="checkbox"
          className="peer size-full appearance-none rounded-[2px] border border-black/25 bg-white checked:border-black checked:bg-black dark:border-white/30 dark:bg-white/5 dark:checked:border-white dark:checked:bg-white"
        />
        <svg
          viewBox="0 0 12 12"
          className="pointer-events-none absolute inset-0 hidden size-full p-0.5 text-white peer-checked:block dark:text-black"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M3 6.2 5 8.1 9 3.9"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
        fill="#EB4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 12.54c-.03-3.02 2.47-4.47 2.58-4.54-1.41-2.06-3.6-2.34-4.38-2.37-1.86-.19-3.64 1.1-4.58 1.1-.95 0-2.42-1.07-3.98-1.04-2.05.03-3.94 1.19-4.99 3.02-2.13 3.69-.54 9.16 1.53 12.15 1.01 1.46 2.22 3.1 3.81 3.04 1.53-.06 2.11-.99 3.96-.99s2.37.99 3.99.96c1.65-.03 2.69-1.49 3.69-2.96 1.16-1.69 1.64-3.33 1.66-3.41-.04-.02-3.2-1.23-3.24-4.87ZM14.03 3.66c.84-1.02 1.41-2.43 1.25-3.84-1.21.05-2.68.81-3.55 1.83-.78.9-1.46 2.34-1.28 3.72 1.35.1 2.73-.69 3.58-1.71Z" />
    </svg>
  );
}
